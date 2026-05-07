// Edge Function: loan-ai-assistant
// Frontend → this Edge Function → GdeDengi AI Proxy (RU) → GigaChat
// Advisory only. Never mutates data. Loads loan context, sends to proxy, logs interaction.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `Ты AI-помощник сервиса ГдеДеньги.
Сервис помогает физическим лицам в РФ оформлять и сопровождать частные займы между собой (P2P, только банковские переводы).
Ты объясняешь пользователю текущий статус займа, следующий шаг и причины блокировок.

ВАЛЮТА:
- Все суммы в контексте этого займа указаны в российских рублях (RUB).
- Никогда не используй знак "$" и не называй суммы долларами/евро/иной валютой.
- Используй "₽" или "руб.". Если валюта не указана отдельно — считай её RUB.

ОГРАНИЧЕНИЯ:
- Ты не юрист и не даёшь окончательных юридических гарантий.
- Ты НЕ подписываешь документы, НЕ подтверждаешь транши, НЕ подтверждаешь платежи, НЕ создаёшь документы и НЕ меняешь реквизиты.
- Любое юридически значимое действие пользователь подтверждает вручную.
- Если пользователь просит выполнить действие — вежливо откажись и подскажи нужный раздел интерфейса.

СЛЕДУЮЩИЙ ШАГ:
- В контексте передан next_action_hint — используй его как основную рекомендацию для пользователя.
- Чётко указывай, чьи именно реквизиты не выбраны (займодавца / заёмщика), если это блокирует шаг.

ФОРМАТ:
- Отвечай кратко, на русском, человеческим языком. Не выдумывай факты — используй только переданный контекст.
- В конце ответа можешь предложить 1-3 раздела интерфейса в формате JSON-блока:
\`\`\`actions
["open_bank_details","open_tranches","open_repayments","open_documents","explain_ai_check","explain_status"]
\`\`\`
Допустимые действия только из этого списка.`;

const ALLOWED_ACTIONS = new Set([
  "open_bank_details", "open_tranches", "open_repayments",
  "open_documents", "explain_ai_check", "explain_status",
]);

function extractActions(answer: string): string[] {
  const m = answer.match(/```actions\s*([\s\S]*?)```/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[1].trim());
    if (Array.isArray(arr)) return arr.filter((a) => typeof a === "string" && ALLOWED_ACTIONS.has(a)).slice(0, 3);
  } catch { /* ignore */ }
  return [];
}

function fmtRub(n: number): string {
  try {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n) + " ₽";
  } catch {
    return `${n} ₽`;
  }
}

// Replace clear $ amounts with ₽ in the answer (loan context is always RUB).
function sanitizeCurrency(text: string): string {
  if (!text) return text;
  let out = text;
  // $1,234.56 / $ 1234 / 1234$
  out = out.replace(/\$\s*([\d][\d\s.,]*)/g, (_m, num) => `${num} ₽`);
  out = out.replace(/([\d][\d\s.,]*)\s*\$/g, (_m, num) => `${num} ₽`);
  out = out.replace(/\bUSD\b/gi, "₽");
  out = out.replace(/\b(долларов|долларах|долларами|доллар(?:а|у|ом)?)\b/gi, "руб.");
  if (/\$|USD/i.test(text)) {
    out += "\n\nПримечание: все суммы в этом займе указаны в российских рублях.";
  }
  return out;
}

function computeNextActionHint(params: {
  status: string;
  userRole: "lender" | "borrower";
  lenderDisbSet: boolean;
  borrowerRepSet: boolean;
  outstanding: number;
  pendingPayments: number;
  hasHighRiskCheck: boolean;
  isFullySigned: boolean;
  hasConfirmedTranche: boolean;
}): { hint: string; suggestedActions: string[] } {
  const {
    status, userRole, lenderDisbSet, borrowerRepSet,
    outstanding, pendingPayments, hasHighRiskCheck, isFullySigned, hasConfirmedTranche,
  } = params;

  if (hasHighRiskCheck) {
    return {
      hint: "Последняя AI-проверка чека помечена как HIGH/BLOCKING. Объясните причину и предложите загрузить корректный чек (российский банк, RUB, статус «исполнено»).",
      suggestedActions: ["explain_ai_check", "open_tranches"],
    };
  }
  if (!isFullySigned) {
    return {
      hint: `Договор ещё не полностью подписан (status=${status}). Подскажите, чья подпись отсутствует, и направьте к разделу подписания.`,
      suggestedActions: ["explain_status", "open_documents"],
    };
  }
  if (!lenderDisbSet) {
    return {
      hint: "Не выбраны реквизиты займодавца для выдачи (disbursement). Транш невозможен, пока займодавец не выберет свои реквизиты в разделе «Реквизиты».",
      suggestedActions: ["open_bank_details"],
    };
  }
  if (!borrowerRepSet) {
    return {
      hint: "Не выбраны реквизиты заёмщика для возврата (repayment). Погашение невозможно, пока заёмщик не выберет свои реквизиты в разделе «Реквизиты».",
      suggestedActions: ["open_bank_details"],
    };
  }
  if (pendingPayments > 0 && userRole === "lender") {
    return {
      hint: `Есть ${pendingPayments} погашение(й) в статусе pending. Займодавцу нужно открыть раздел «Погашения» и подтвердить факт получения средств.`,
      suggestedActions: ["open_repayments"],
    };
  }
  if (!hasConfirmedTranche && userRole === "lender") {
    return {
      hint: "Договор подписан, реквизиты готовы — займодавцу пора сделать первый транш переводом и затем зафиксировать его в разделе «Транши».",
      suggestedActions: ["open_tranches"],
    };
  }
  if (outstanding > 0 && userRole === "borrower") {
    return {
      hint: `У заёмщика остаток долга ${fmtRub(outstanding)}. Нужно сделать перевод по реквизитам займодавца и зафиксировать погашение в разделе «Погашения».`,
      suggestedActions: ["open_repayments"],
    };
  }
  if (outstanding > 0 && userRole === "lender") {
    return {
      hint: `Остаток долга ${fmtRub(outstanding)}. Займодавец ожидает перевод от заёмщика и подтверждает поступления в разделе «Погашения».`,
      suggestedActions: ["open_repayments"],
    };
  }
  if (outstanding <= 0 && hasConfirmedTranche) {
    return {
      hint: "Долг полностью погашен. Можно сформировать итоговое подтверждение полного возврата (Приложение 5) в разделе документов.",
      suggestedActions: ["open_documents"],
    };
  }
  return {
    hint: "Чёткого следующего шага нет — кратко опишите текущее состояние займа.",
    suggestedActions: ["explain_status"],
  };
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
    return json(500, { ok: false, stage: "config", error: "Не настроены GDEDENGI_AI_PROXY_URL / GDEDENGI_AI_PROXY_SECRET" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { ok: false, error: "Требуется авторизация" });

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userData?.user) return json(401, { ok: false, error: "Невалидный токен" });
  const userId = userData.user.id;

  let body: any;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "Невалидный JSON" }); }

  const loanId = typeof body?.loan_id === "string" ? body.loan_id : null;
  const userMessage = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!loanId || !userMessage) return json(400, { ok: false, error: "Требуются loan_id и message" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: loan, error: loanErr } = await admin
    .from("loans")
    .select("id, contract_number, status, lender_id, borrower_id, lender_name, borrower_name, amount, repayment_date, signature_scheme_requested, interest_mode, interest_rate")
    .eq("id", loanId)
    .maybeSingle();
  if (loanErr || !loan) return json(404, { ok: false, error: "Договор не найден" });
  if (loan.lender_id !== userId && loan.borrower_id !== userId) {
    return json(403, { ok: false, error: "Нет доступа к этому договору" });
  }
  const userRole: "lender" | "borrower" = loan.lender_id === userId ? "lender" : "borrower";

  const [
    { data: signatures },
    { data: tranches },
    { data: payments },
    { data: schedule },
    { data: aiChecks },
    { data: docs },
    { data: allowedBank },
    { data: sigPackage },
  ] = await Promise.all([
    admin.from("loan_signatures").select("role, signed_at").eq("loan_id", loanId),
    admin.from("loan_tranches").select("tranche_number, amount, status, planned_date, actual_date, ai_risk_level").eq("loan_id", loanId).order("tranche_number"),
    admin.from("loan_payments").select("transfer_amount, transfer_date, status, ai_risk_level").eq("loan_id", loanId).order("transfer_date"),
    admin.from("payment_schedule_items").select("item_number, due_date, total_amount, status").eq("loan_id", loanId).order("item_number"),
    admin.from("ai_fraud_checks").select("entity_type, risk_level, blocking_reasons, ai_summary, created_at").eq("loan_id", loanId).order("created_at", { ascending: false }).limit(3),
    admin.from("generated_documents").select("document_type, created_at").eq("loan_id", loanId).order("created_at", { ascending: false }),
    admin.from("loan_allowed_bank_details").select("party_role, purpose").eq("loan_id", loanId),
    admin.from("signature_packages").select("package_status, signature_scheme_effective, app6_status").eq("loan_id", loanId).maybeSingle(),
  ]);

  const totalDisbursed = (tranches ?? []).filter((t) => t.status === "confirmed").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalRepaid = (payments ?? []).filter((p) => p.status === "confirmed").reduce((s, p) => s + Number(p.transfer_amount || 0), 0);
  const outstanding = totalDisbursed - totalRepaid;
  const pendingPayments = (payments ?? []).filter((p) => p.status === "pending").length;
  const hasConfirmedTranche = (tranches ?? []).some((t) => t.status === "confirmed");
  const hasHighRiskCheck = (aiChecks ?? []).some((c) => c.risk_level === "HIGH" || c.risk_level === "BLOCKING");

  const lenderDisbSet = (allowedBank ?? []).some((b) => b.party_role === "lender" && b.purpose === "disbursement");
  const borrowerDisbSet = (allowedBank ?? []).some((b) => b.party_role === "borrower" && b.purpose === "disbursement");
  const lenderRepSet = (allowedBank ?? []).some((b) => b.party_role === "lender" && b.purpose === "repayment");
  const borrowerRepSet = (allowedBank ?? []).some((b) => b.party_role === "borrower" && b.purpose === "repayment");

  const isFullySigned = ["fully_signed", "signed_no_debt", "active", "repaid"].includes(loan.status)
    || ((signatures ?? []).some((s) => s.role === "lender") && (signatures ?? []).some((s) => s.role === "borrower"));

  const next = computeNextActionHint({
    status: loan.status,
    userRole,
    lenderDisbSet,
    borrowerRepSet,
    outstanding,
    pendingPayments,
    hasHighRiskCheck,
    isFullySigned,
    hasConfirmedTranche,
  });

  const context = {
    loan_id: loan.id,
    contract_number: loan.contract_number,
    status: loan.status,
    user_role: userRole,
    counterparty_name: userRole === "lender" ? loan.borrower_name : loan.lender_name,
    currency: "RUB",
    currency_symbol: "₽",
    amount: Number(loan.amount),
    amount_display: fmtRub(Number(loan.amount)),
    interest_mode: loan.interest_mode,
    interest_rate: Number(loan.interest_rate),
    repayment_date: loan.repayment_date,
    signature_scheme: loan.signature_scheme_requested,
    signature_package: sigPackage ?? null,
    signatures: (signatures ?? []).map((s) => s.role),
    bank_details_readiness: {
      lender_disbursement_set: lenderDisbSet,
      borrower_disbursement_set: borrowerDisbSet,
      lender_repayment_set: lenderRepSet,
      borrower_repayment_set: borrowerRepSet,
      tranche_ready: lenderDisbSet,
      repayment_ready: borrowerRepSet,
    },
    totals: {
      disbursed: totalDisbursed,
      repaid: totalRepaid,
      outstanding,
      total_disbursed_display: fmtRub(totalDisbursed),
      total_repaid_display: fmtRub(totalRepaid),
      outstanding_display: fmtRub(outstanding),
    },
    pending_payments_count: pendingPayments,
    tranches_summary: (tranches ?? []).map((t) => ({ n: t.tranche_number, amount: Number(t.amount), amount_display: fmtRub(Number(t.amount)), status: t.status, ai_risk: t.ai_risk_level })),
    payments_summary: (payments ?? []).map((p) => ({ amount: Number(p.transfer_amount), amount_display: fmtRub(Number(p.transfer_amount)), status: p.status, date: p.transfer_date, ai_risk: p.ai_risk_level })),
    schedule_summary: (schedule ?? []).map((s) => ({ n: s.item_number, due: s.due_date, amount: Number(s.total_amount), amount_display: fmtRub(Number(s.total_amount)), status: s.status })),
    latest_ai_checks: (aiChecks ?? []).map((c) => ({ entity_type: c.entity_type, risk_level: c.risk_level, blocking_reasons: c.blocking_reasons, summary: c.ai_summary })),
    documents_available: (docs ?? []).map((d) => d.document_type),
    next_action_hint: next.hint,
  };

  const fullPrompt = `${SYSTEM_PROMPT}

КОНТЕКСТ ЗАЙМА (JSON, все суммы в RUB):
${JSON.stringify(context, null, 2)}

ВОПРОС ПОЛЬЗОВАТЕЛЯ:
${userMessage}`;

  const endpoint = `${PROXY_URL.replace(/\/$/, "")}/gigachat/chat`;
  const startedAt = Date.now();
  let httpStatus = 0, errorText: string | null = null, answer: string | null = null;
  let promptTokens: number | null = null, completionTokens: number | null = null, totalTokens: number | null = null;
  let rawText: string | null = null;

  try {
    const proxyRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": PROXY_SECRET },
      body: JSON.stringify({ message: fullPrompt }),
    });
    httpStatus = proxyRes.status;
    rawText = await proxyRes.text();
    let parsed: any = null;
    try { parsed = rawText ? JSON.parse(rawText) : null; } catch { /* */ }
    if (!proxyRes.ok) {
      errorText = parsed?.error ?? `Прокси вернул статус ${proxyRes.status}`;
    } else {
      answer = parsed?.answer ?? parsed?.message ?? parsed?.choices?.[0]?.message?.content ?? (typeof parsed === "string" ? parsed : rawText);
      promptTokens = parsed?.usage?.prompt_tokens ?? null;
      completionTokens = parsed?.usage?.completion_tokens ?? null;
      totalTokens = parsed?.usage?.total_tokens ?? null;
    }
  } catch (e) {
    errorText = `Сетевая ошибка: ${e instanceof Error ? e.message : String(e)}`;
  }

  const duration = Date.now() - startedAt;

  try {
    await admin.from("ai_interactions").insert({
      user_id: userId,
      endpoint: "/loan-ai-assistant",
      request_message: `[loan:${loanId}] ${userMessage}`,
      response_text: answer ?? rawText,
      http_status: httpStatus || null,
      error: errorText,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      duration_ms: duration,
    });
  } catch (e) { console.error("ai_interactions log failed", e); }

  if (errorText) {
    return json(502, { ok: false, httpStatus, stage: "proxy", error: errorText });
  }

  const cleanedAnswerRaw = (answer ?? "").replace(/```actions[\s\S]*?```/g, "").trim();
  const cleanAnswer = sanitizeCurrency(cleanedAnswerRaw);
  const modelActions = extractActions(answer ?? "");
  // Merge model + deterministic suggestions, dedupe, cap at 3.
  const suggested_actions = Array.from(new Set([...modelActions, ...next.suggestedActions])).slice(0, 3);

  return json(200, {
    ok: true,
    answer: cleanAnswer,
    suggested_actions,
    next_action_hint: next.hint,
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens },
    duration_ms: duration,
  });
});
