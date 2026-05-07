// Edge Function: ai-payment-proof-analysis
// Frontend → this function → external proxy → GigaChat (vision/OCR)
// Performs AI extraction + deterministic checks against loan data, stores results.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type EntityType = "tranche" | "repayment";

interface AnalysisRequest {
  loan_id: string;
  entity_type: EntityType;
  entity_id?: string | null;
  file_url: string;
  expected_amount?: number | null;
  expected_role_context?: "tranche_disbursement" | "loan_repayment" | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const PROXY_URL = Deno.env.get("GDEDENGI_AI_PROXY_URL");
  const PROXY_SECRET = Deno.env.get("GDEDENGI_AI_PROXY_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!PROXY_URL || !PROXY_SECRET) {
    return json(500, {
      ok: false,
      stage: "config",
      error: "Не настроены секреты GDEDENGI_AI_PROXY_URL / GDEDENGI_AI_PROXY_SECRET",
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { ok: false, error: "Требуется авторизация" });

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userData?.user) return json(401, { ok: false, error: "Невалидный токен" });
  const userId = userData.user.id;

  let body: AnalysisRequest;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Невалидный JSON" });
  }

  if (!body?.loan_id || !body?.entity_type || !body?.file_url) {
    return json(400, { ok: false, error: "Не хватает loan_id / entity_type / file_url" });
  }
  if (body.entity_type !== "tranche" && body.entity_type !== "repayment") {
    return json(400, { ok: false, error: "Недопустимый entity_type" });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify caller is a party to the loan and load loan context.
  const { data: loan, error: loanErr } = await supabaseAdmin
    .from("loans")
    .select(
      "id, lender_id, borrower_id, lender_name, borrower_name, contract_number, amount, repayment_date"
    )
    .eq("id", body.loan_id)
    .maybeSingle();
  if (loanErr || !loan) return json(404, { ok: false, error: "Договор не найден" });
  if (loan.lender_id !== userId && loan.borrower_id !== userId) {
    return json(403, { ok: false, error: "Нет доступа к этому договору" });
  }

  // Cumulative tranche total for limit check.
  const { data: tranches } = await supabaseAdmin
    .from("loan_tranches")
    .select("id, amount, status, bank_document_id")
    .eq("loan_id", body.loan_id)
    .in("status", ["planned", "sent", "confirmed"]);

  const otherTranchesTotal = (tranches || [])
    .filter((t) => !body.entity_id || t.id !== body.entity_id)
    .reduce((s, t) => s + Number(t.amount), 0);

  // ---- Call external AI proxy ----
  const proxyEndpoint = `${PROXY_URL.replace(/\/$/, "")}/gigachat/analyze-payment-proof`;
  const startedAt = Date.now();
  let proxyHttp = 0;
  let proxyJson: any = null;
  let proxyError: string | null = null;
  let proxyRaw = "";

  try {
    const r = await fetch(proxyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": PROXY_SECRET },
      body: JSON.stringify({
        file_url: body.file_url,
        expected_amount: body.expected_amount ?? null,
        expected_role_context: body.expected_role_context ?? null,
        contract_number: loan.contract_number,
      }),
    });
    proxyHttp = r.status;
    proxyRaw = await r.text();
    try { proxyJson = proxyRaw ? JSON.parse(proxyRaw) : null; } catch { /* keep raw */ }
    if (!r.ok) {
      if (r.status === 404) {
        proxyError = "AI payment proof analysis endpoint is not deployed yet";
      } else {
        proxyError = proxyJson?.error ?? `Прокси вернул статус ${r.status}`;
      }
    }
  } catch (e) {
    proxyError = `Сетевая ошибка прокси: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (proxyError) {
    return json(502, {
      ok: false,
      stage: "proxy",
      httpStatus: proxyHttp,
      error: proxyError,
      raw: proxyRaw?.slice(0, 1000),
    });
  }

  const extracted = proxyJson?.extracted ?? {};
  const aiSummary: string = proxyJson?.ai_summary ?? "";
  const fraudSignals: any[] = Array.isArray(proxyJson?.fraud_signals) ? proxyJson.fraud_signals : [];

  // ---- Deterministic checks ----
  type Check = { id: string; level: "ok" | "info" | "warn" | "high" | "blocking"; message: string };
  const checks: Check[] = [];
  const blockingReasons: string[] = [];
  let amountMismatch = false;
  let limitViolation = false;
  let duplicateOpId = false;

  const extractedAmount = Number(extracted.amount);
  const extractedConfidence = Number(extracted.confidence);
  const expected = body.expected_amount != null ? Number(body.expected_amount) : null;

  if (expected != null && Number.isFinite(extractedAmount) && extractedAmount > 0) {
    const diff = Math.abs(extractedAmount - expected);
    const tolerance = Math.max(1, expected * 0.005);
    if (diff <= tolerance) {
      checks.push({ id: "amount_match", level: "ok", message: `Сумма совпадает с ожидаемой (${expected.toLocaleString("ru-RU")} ₽).` });
    } else {
      amountMismatch = true;
      checks.push({
        id: "amount_match",
        level: "high",
        message: `Сумма в чеке ${extractedAmount.toLocaleString("ru-RU")} ₽ не совпадает с ожидаемой ${expected.toLocaleString("ru-RU")} ₽.`,
      });
    }
  } else if (expected != null) {
    checks.push({ id: "amount_match", level: "warn", message: "Не удалось извлечь сумму из чека." });
  }

  // Tranche cumulative limit
  if (body.entity_type === "tranche" && Number.isFinite(extractedAmount) && extractedAmount > 0) {
    const wouldBe = otherTranchesTotal + extractedAmount;
    if (wouldBe > Number(loan.amount)) {
      limitViolation = true;
      blockingReasons.push(
        `Сумма транша ${extractedAmount.toLocaleString("ru-RU")} ₽ превысит лимит договора (${Number(loan.amount).toLocaleString("ru-RU")} ₽).`
      );
      checks.push({ id: "loan_limit", level: "blocking", message: blockingReasons[blockingReasons.length - 1] });
    } else {
      checks.push({ id: "loan_limit", level: "ok", message: "Сумма не превышает лимит договора." });
    }
  }

  // Contract number in payment purpose
  if (loan.contract_number) {
    const purpose = String(extracted.payment_purpose ?? "").toLowerCase();
    if (purpose && purpose.includes(String(loan.contract_number).toLowerCase())) {
      checks.push({ id: "contract_in_purpose", level: "ok", message: "Номер договора найден в назначении платежа." });
    } else {
      checks.push({ id: "contract_in_purpose", level: "warn", message: `Номер договора ${loan.contract_number} не найден в назначении платежа.` });
    }
  }

  // Receiver / sender consistency vs loan parties
  const senderName = String(extracted.sender_name ?? "").trim().toLowerCase();
  const receiverName = String(extracted.receiver_name ?? "").trim().toLowerCase();
  const lenderName = String(loan.lender_name ?? "").trim().toLowerCase();
  const borrowerName = String(loan.borrower_name ?? "").trim().toLowerCase();
  const namesContain = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a));

  if (body.entity_type === "tranche") {
    // disbursement: lender → borrower
    if (senderName && lenderName) {
      if (namesContain(senderName, lenderName)) {
        checks.push({ id: "sender_match", level: "ok", message: "Отправитель соответствует займодавцу." });
      } else {
        checks.push({ id: "sender_match", level: "high", message: `Отправитель «${extracted.sender_name}» не похож на займодавца «${loan.lender_name}».` });
      }
    }
    if (receiverName && borrowerName) {
      if (namesContain(receiverName, borrowerName)) {
        checks.push({ id: "receiver_match", level: "ok", message: "Получатель соответствует заёмщику." });
      } else {
        checks.push({ id: "receiver_match", level: "high", message: `Получатель «${extracted.receiver_name}» не похож на заёмщика «${loan.borrower_name}».` });
      }
    }
  } else {
    // repayment: borrower → lender
    if (senderName && borrowerName) {
      if (namesContain(senderName, borrowerName)) {
        checks.push({ id: "sender_match", level: "ok", message: "Отправитель соответствует заёмщику." });
      } else {
        checks.push({ id: "sender_match", level: "high", message: `Отправитель «${extracted.sender_name}» не похож на заёмщика «${loan.borrower_name}».` });
      }
    }
    if (receiverName && lenderName) {
      if (namesContain(receiverName, lenderName)) {
        checks.push({ id: "receiver_match", level: "ok", message: "Получатель соответствует займодавцу." });
      } else {
        checks.push({ id: "receiver_match", level: "high", message: `Получатель «${extracted.receiver_name}» не похож на займодавцу «${loan.lender_name}».` });
      }
    }
  }

  // Duplicate operation_id across loan
  const opId = String(extracted.operation_id ?? "").trim();
  if (opId) {
    const dupTranche = (tranches || []).some((t) => (t.bank_document_id ?? "").trim() === opId && t.id !== body.entity_id);
    let dupRepayment = false;
    if (!dupTranche) {
      const { data: pays } = await supabaseAdmin
        .from("loan_payments")
        .select("id, transaction_id")
        .eq("loan_id", body.loan_id);
      dupRepayment = (pays || []).some((p) => (p.transaction_id ?? "").trim() === opId && p.id !== body.entity_id);
    }
    if (dupTranche || dupRepayment) {
      duplicateOpId = true;
      blockingReasons.push(`ID операции «${opId}» уже использовался в другом платеже по этому договору.`);
      checks.push({ id: "duplicate_operation_id", level: "blocking", message: blockingReasons[blockingReasons.length - 1] });
    } else {
      checks.push({ id: "duplicate_operation_id", level: "ok", message: "ID операции уникален в рамках договора." });
    }
  }

  // Payment date plausibility
  const paymentDate = extracted.payment_date ? new Date(String(extracted.payment_date)) : null;
  if (paymentDate && !Number.isNaN(paymentDate.getTime())) {
    const now = new Date();
    if (paymentDate > new Date(now.getTime() + 24 * 3600 * 1000)) {
      checks.push({ id: "date_plausible", level: "high", message: "Дата платежа в будущем." });
    } else if (paymentDate < new Date("2020-01-01")) {
      checks.push({ id: "date_plausible", level: "warn", message: "Подозрительно старая дата платежа." });
    } else {
      checks.push({ id: "date_plausible", level: "ok", message: "Дата платежа в допустимом диапазоне." });
    }
  }

  // Confidence
  if (Number.isFinite(extractedConfidence)) {
    if (extractedConfidence < 0.5) {
      checks.push({ id: "confidence", level: "high", message: `Низкая уверенность распознавания: ${(extractedConfidence * 100).toFixed(0)}%.` });
    } else if (extractedConfidence < 0.75) {
      checks.push({ id: "confidence", level: "warn", message: `Средняя уверенность распознавания: ${(extractedConfidence * 100).toFixed(0)}%.` });
    } else {
      checks.push({ id: "confidence", level: "ok", message: `Высокая уверенность распознавания: ${(extractedConfidence * 100).toFixed(0)}%.` });
    }
  }

  // Compute final risk level
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING" = "LOW";
  if (blockingReasons.length > 0 || duplicateOpId || limitViolation) {
    riskLevel = "BLOCKING";
  } else if (
    amountMismatch ||
    checks.some((c) => c.level === "high") ||
    (Number.isFinite(extractedConfidence) && extractedConfidence < 0.5)
  ) {
    riskLevel = "HIGH";
  } else if (checks.some((c) => c.level === "warn")) {
    riskLevel = "MEDIUM";
  }

  let riskScore = 0;
  for (const c of checks) {
    if (c.level === "blocking") riskScore += 50;
    else if (c.level === "high") riskScore += 25;
    else if (c.level === "warn") riskScore += 8;
  }

  // Persist results
  const insertExtracted = await supabaseAdmin.from("ai_extracted_payment_data").insert({
    loan_id: body.loan_id,
    entity_type: body.entity_type,
    entity_id: body.entity_id ?? null,
    source_file_url: body.file_url,
    amount: Number.isFinite(extractedAmount) ? extractedAmount : null,
    currency: extracted.currency ?? null,
    payment_date: extracted.payment_date ?? null,
    payment_time: extracted.payment_time ?? null,
    sender_name: extracted.sender_name ?? null,
    receiver_name: extracted.receiver_name ?? null,
    bank_name: extracted.bank_name ?? null,
    operation_id: extracted.operation_id ?? null,
    payment_purpose: extracted.payment_purpose ?? null,
    confidence: Number.isFinite(extractedConfidence) ? extractedConfidence : null,
    raw_extraction_json: extracted,
    created_by: userId,
  }).select("id").single();

  const insertCheck = await supabaseAdmin.from("ai_fraud_checks").insert({
    loan_id: body.loan_id,
    entity_type: body.entity_type,
    entity_id: body.entity_id ?? null,
    risk_level: riskLevel,
    risk_score: riskScore,
    checks_json: { checks, fraud_signals: fraudSignals },
    ai_summary: aiSummary,
    blocking_reasons: blockingReasons,
    created_by: userId,
  }).select("id").single();

  return json(200, {
    ok: true,
    duration_ms: Date.now() - startedAt,
    risk_level: riskLevel,
    risk_score: riskScore,
    blocking_reasons: blockingReasons,
    checks,
    ai_summary: aiSummary,
    fraud_signals: fraudSignals,
    extracted: {
      amount: Number.isFinite(extractedAmount) ? extractedAmount : null,
      currency: extracted.currency ?? null,
      payment_date: extracted.payment_date ?? null,
      payment_time: extracted.payment_time ?? null,
      sender_name: extracted.sender_name ?? null,
      receiver_name: extracted.receiver_name ?? null,
      bank_name: extracted.bank_name ?? null,
      operation_id: extracted.operation_id ?? null,
      payment_purpose: extracted.payment_purpose ?? null,
      confidence: Number.isFinite(extractedConfidence) ? extractedConfidence : null,
    },
    record_ids: {
      extracted_id: insertExtracted.data?.id ?? null,
      check_id: insertCheck.data?.id ?? null,
    },
    advisory: true,
  });
});
