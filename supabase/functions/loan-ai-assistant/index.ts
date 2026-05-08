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

// ================= Public label maps =================
function statusLabel(s: string): string {
  const m: Record<string, string> = {
    draft: "черновик",
    awaiting_signatures: "ожидает подписания",
    signed_by_lender: "подписан займодавцем, ждёт подписи заёмщика",
    signed_by_borrower: "подписан заёмщиком, ждёт подписи займодавца",
    fully_signed: "договор подписан обеими сторонами",
    signed_no_debt: "договор подписан, деньги ещё не выданы",
    active: "действующий займ",
    repaid: "займ погашен",
    overdue: "есть просрочка",
  };
  return m[s] ?? "статус займа уточняется";
}
function roleLabel(r: "lender" | "borrower"): string {
  return r === "lender" ? "займодавец" : "заёмщик";
}
function riskLabel(r: string | null | undefined): string {
  switch (r) {
    case "LOW": return "низкий риск";
    case "MEDIUM": return "есть небольшие замечания";
    case "HIGH": return "нужна ручная проверка";
    case "BLOCKING": return "чек не подходит";
    default: return "проверка не выполнялась";
  }
}
function purposeLabel(p: string): string {
  return p === "disbursement" ? "выдача денег" : p === "repayment" ? "возврат денег" : p;
}

const DOC_LABELS: Record<string, string> = {
  loan_contract: "Договор займа",
  appendix_bank_details: "Приложение 1: реквизиты сторон",
  appendix_repayment_schedule: "Приложение 2: график платежей",
  tranche_receipt: "Расписка о получении транша",
  partial_repayment_confirmation: "Подтверждение частичного погашения",
  full_repayment_confirmation: "Подтверждение полного погашения",
  unep_agreement: "Приложение 6: соглашение об УНЭП",
  edo_regulation: "Регламент ЭДО",
};
function docLabel(t: string): string { return DOC_LABELS[t] ?? t; }

type DocItem = { type: string; label: string; reason?: string; count?: number };
type DocAvailability = {
  generated: DocItem[];
  available_now: DocItem[];
  not_available_yet: DocItem[];
  documents_summary_human: string;
};

function computeDocumentAvailability(p: {
  isFullySigned: boolean;
  trancheReady: boolean;
  hasConfirmedTranche: boolean;
  confirmedTrancheCount: number;
  hasSchedule: boolean;
  confirmedRepaymentCount: number;
  totalDisbursed: number;
  totalRepaid: number;
  loanAmount: number;
  loanStatus: string;
  signatureScheme: string;
  hasEdoRegulation: boolean;
  generatedDocs: string[];
}): DocAvailability {
  const generatedSet = new Map<string, number>();
  for (const d of p.generatedDocs) generatedSet.set(d, (generatedSet.get(d) ?? 0) + 1);

  const generated: DocItem[] = [];
  const available_now: DocItem[] = [];
  const not_available_yet: DocItem[] = [];

  const pushGen = (type: string) => {
    if (generatedSet.has(type)) generated.push({ type, label: docLabel(type), count: generatedSet.get(type)! });
  };

  // 1. Loan contract
  pushGen("loan_contract");
  if (p.isFullySigned) {
    if (!generatedSet.has("loan_contract")) available_now.push({ type: "loan_contract", label: docLabel("loan_contract"), reason: "Договор подписан обеими сторонами." });
  } else {
    not_available_yet.push({ type: "loan_contract", label: docLabel("loan_contract"), reason: "Сначала договор должны подписать обе стороны." });
  }

  // 2. APP1 bank details
  pushGen("appendix_bank_details");
  if (p.isFullySigned && p.trancheReady) {
    if (!generatedSet.has("appendix_bank_details")) available_now.push({ type: "appendix_bank_details", label: docLabel("appendix_bank_details"), reason: "Реквизиты сторон выбраны." });
  } else {
    not_available_yet.push({ type: "appendix_bank_details", label: docLabel("appendix_bank_details"), reason: "Сначала стороны должны выбрать реквизиты." });
  }

  // 3. APP2 schedule
  pushGen("appendix_repayment_schedule");
  if (p.hasSchedule) {
    if (!generatedSet.has("appendix_repayment_schedule")) available_now.push({ type: "appendix_repayment_schedule", label: docLabel("appendix_repayment_schedule"), reason: "График платежей сформирован." });
  } else {
    not_available_yet.push({ type: "appendix_repayment_schedule", label: docLabel("appendix_repayment_schedule"), reason: "График не предусмотрен или ещё не сформирован." });
  }

  // 4. APP3 tranche receipt
  pushGen("tranche_receipt");
  if (p.confirmedTrancheCount > 0) {
    available_now.push({ type: "tranche_receipt", label: docLabel("tranche_receipt"), reason: `По подтверждённым траншам: ${p.confirmedTrancheCount}.` });
  } else {
    not_available_yet.push({ type: "tranche_receipt", label: docLabel("tranche_receipt"), reason: "Появится после подтверждения транша." });
  }

  // 5. APP4 partial repayment
  pushGen("partial_repayment_confirmation");
  const fullyClosed = p.totalDisbursed > 0 && p.totalRepaid >= p.totalDisbursed;
  if (p.confirmedRepaymentCount > 0 && !fullyClosed) {
    available_now.push({ type: "partial_repayment_confirmation", label: docLabel("partial_repayment_confirmation"), reason: `По подтверждённым погашениям: ${p.confirmedRepaymentCount}.` });
  } else if (p.confirmedRepaymentCount === 0) {
    not_available_yet.push({ type: "partial_repayment_confirmation", label: docLabel("partial_repayment_confirmation"), reason: "Появится после подтверждения погашения." });
  }

  // 6. APP5 full repayment
  pushGen("full_repayment_confirmation");
  const canFull = p.totalDisbursed >= p.loanAmount && p.totalRepaid >= p.totalDisbursed && p.totalDisbursed > 0;
  if (canFull) {
    if (!generatedSet.has("full_repayment_confirmation")) available_now.push({ type: "full_repayment_confirmation", label: docLabel("full_repayment_confirmation"), reason: "Займ полностью погашен." });
  } else {
    not_available_yet.push({ type: "full_repayment_confirmation", label: docLabel("full_repayment_confirmation"), reason: "Появится после полного погашения займа." });
  }

  // 7. APP6 UNEP
  pushGen("unep_agreement");
  if (p.signatureScheme === "UNEP_WITH_APPENDIX_6") {
    if (!generatedSet.has("unep_agreement")) available_now.push({ type: "unep_agreement", label: docLabel("unep_agreement"), reason: "Выбрана схема подписания УНЭП." });
  } else {
    not_available_yet.push({ type: "unep_agreement", label: docLabel("unep_agreement"), reason: "Не требуется для этого займа." });
  }

  // 8. EDO regulation
  if (p.hasEdoRegulation) {
    available_now.push({ type: "edo_regulation", label: docLabel("edo_regulation"), reason: "Действующая редакция регламента опубликована." });
  } else {
    not_available_yet.push({ type: "edo_regulation", label: docLabel("edo_regulation"), reason: "Регламент ЭДО ещё не опубликован." });
  }

  let summary = "";
  const genLabels = generated.map((g) => g.label);
  const availLabels = available_now.map((g) => g.label);
  if (genLabels.length === 0 && availLabels.length === 0) {
    const blockers = not_available_yet.slice(0, 2).map((d) => `${d.label} — ${d.reason}`).join("; ");
    summary = `Пока документы недоступны. ${blockers}`;
  } else {
    const parts: string[] = [];
    if (genLabels.length > 0) parts.push(`Уже сформированы: ${genLabels.join(", ")}.`);
    if (availLabels.length > 0) parts.push(`Сейчас можно сформировать: ${availLabels.join(", ")}.`);
    const futureBlockers = not_available_yet
      .filter((d) => d.type === "tranche_receipt" || d.type === "partial_repayment_confirmation" || d.type === "full_repayment_confirmation")
      .slice(0, 2)
      .map((d) => `${d.label.toLowerCase()} — ${d.reason.toLowerCase()}`);
    if (futureBlockers.length > 0) parts.push(`Пока недоступно: ${futureBlockers.join("; ")}`);
    summary = parts.join(" ");
  }

  return { generated, available_now, not_available_yet, documents_summary_human: summary };
}

const SYSTEM_PROMPT = `Ты AI-помощник сервиса ГдеДеньги. Сервис помогает физическим лицам в РФ оформлять и сопровождать частные займы между собой (P2P, только банковские переводы).

ТВОЯ РОЛЬ:
- Отвечай как спокойный продуктовый менеджер службы поддержки, человеческим языком.
- Сначала прямой ответ на вопрос, затем краткое объяснение причин простыми словами, затем 1–3 следующих шага.
- Не цитируй JSON, не упоминай названия полей, статусов и кодов из контекста.

ВАЛЮТА:
- Все суммы в RUB. Никогда не используй "$", "USD", "доллар". Используй "₽" или "руб.".

ЗАПРЕЩЁННЫЕ СЛОВА И КОДЫ (никогда не показывай пользователю):
active, draft, fully_signed, signed_no_debt, awaiting_signatures, signed_by_lender, signed_by_borrower, repaid, overdue, pending, confirmed, lender, borrower, user_role, status, risk_level, HIGH, MEDIUM, LOW, BLOCKING, disbursement, repayment, tranche_ready, repayment_ready.
Если в контексте встречаются такие слова — переведи их в человеческий русский, используя поля *_label из public_context_summary и context.

ЧЕЛОВЕЧЕСКИЕ ФОРМУЛИРОВКИ:
- Вместо "user_role: borrower" → "вы выступаете как заёмщик".
- Вместо "status: active" → "займ действующий".
- Вместо "HIGH/BLOCKING" → "проверка чека показала проблему" / "чек не подходит".
- Вместо "disbursement/repayment requisites" → "реквизиты для перевода денег" / "реквизиты для возврата".

ДЕЙСТВИЯ:
- Ты НЕ подписываешь, НЕ подтверждаешь транши и платежи, НЕ создаёшь документы, НЕ меняешь реквизиты.
- Если просят выполнить действие — вежливо откажись и подскажи нужный раздел интерфейса.

СЛЕДУЮЩИЙ ШАГ:
- В контексте передан next_action_hint — используй его как основу рекомендации, но переформулируй живым языком.
- Чётко указывай, чьих именно реквизитов не хватает (займодавца / заёмщика, для выдачи или для возврата), используя человеческие формулировки.

ИНТЕНТЫ:
- Если в начале сообщения пользователя есть "INTENT: explain_ai_check" или "INTENT: explain_status" — режим "deeper_explanation": дай более глубокое объяснение, не повторяй прошлый ответ дословно, добавь больше деталей о причинах и конкретных следующих шагах.

ФОРМАТ:
- Кратко, по делу, на русском.
- В конце можешь предложить 1–3 раздела интерфейса в JSON-блоке:
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
  try { return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n) + " ₽"; }
  catch { return `${n} ₽`; }
}

function sanitizeOutput(text: string): string {
  if (!text) return text;
  let out = text;
  // currency
  out = out.replace(/\$\s*([\d][\d\s.,]*)/g, (_m, num) => `${num} ₽`);
  out = out.replace(/([\d][\d\s.,]*)\s*\$/g, (_m, num) => `${num} ₽`);
  out = out.replace(/\bUSD\b/gi, "₽");
  out = out.replace(/\b(долларов|долларах|долларами|доллар(?:а|у|ом)?)\b/gi, "руб.");
  // internal codes → human
  const replacements: Array<[RegExp, string]> = [
    [/\bstatus\s*[:=]\s*active\b/gi, "займ действующий"],
    [/\bstatus\s*[:=]\s*draft\b/gi, "черновик"],
    [/\bstatus\s*[:=]\s*fully_signed\b/gi, "договор подписан обеими сторонами"],
    [/\bstatus\s*[:=]\s*signed_no_debt\b/gi, "договор подписан, деньги ещё не выданы"],
    [/\bstatus\s*[:=]\s*repaid\b/gi, "займ погашен"],
    [/\buser_role\s*[:=]\s*borrower\b/gi, "вы — заёмщик"],
    [/\buser_role\s*[:=]\s*lender\b/gi, "вы — займодавец"],
    [/\bHIGH\/BLOCKING\b/g, "чек требует ручной проверки или не подходит"],
    [/\bBLOCKING\b/g, "чек не подходит"],
    [/\bHIGH\b/g, "нужна ручная проверка"],
    [/\bMEDIUM\b/g, "есть небольшие замечания"],
    [/\bLOW\b/g, "низкий риск"],
    [/\bdisbursement\b/gi, "выдача денег"],
    [/\brepayment\b/gi, "возврат денег"],
    [/\bfully_signed\b/gi, "договор подписан обеими сторонами"],
    [/\bsigned_no_debt\b/gi, "договор подписан, деньги ещё не выданы"],
    [/\bawaiting_signatures\b/gi, "ожидает подписания"],
    [/\bsigned_by_lender\b/gi, "подписан займодавцем"],
    [/\bsigned_by_borrower\b/gi, "подписан заёмщиком"],
    [/\bactive\b/g, "действующий"],
    [/\brepaid\b/g, "погашен"],
    [/\boverdue\b/g, "просрочен"],
    [/\bpending\b/gi, "в ожидании подтверждения"],
  ];
  for (const [re, rep] of replacements) out = out.replace(re, rep);
  if (/\$|USD/i.test(text)) {
    out += "\n\nПримечание: все суммы в этом займе указаны в российских рублях.";
  }
  return out;
}

function computeNextActionHint(params: {
  status: string;
  userRole: "lender" | "borrower";
  lenderDisbSet: boolean;
  borrowerDisbSet: boolean;
  lenderRepSet: boolean;
  borrowerRepSet: boolean;
  outstanding: number;
  pendingPayments: number;
  hasHighRiskCheck: boolean;
  isFullySigned: boolean;
  hasConfirmedTranche: boolean;
}): { hint: string; suggestedActions: string[] } {
  const {
    status, userRole, lenderDisbSet, borrowerDisbSet, lenderRepSet, borrowerRepSet,
    outstanding, pendingPayments, hasHighRiskCheck, isFullySigned, hasConfirmedTranche,
  } = params;

  if (hasHighRiskCheck) {
    return {
      hint: "Последняя проверка чека показала проблему. Нужно открыть детали проверки, понять причину и загрузить корректный чек российского банка с переводом в рублях и подтверждённым статусом исполнения.",
      suggestedActions: ["explain_ai_check", "open_tranches"],
    };
  }
  if (!isFullySigned) {
    return {
      hint: `Договор ещё не подписан обеими сторонами (сейчас: ${statusLabel(status)}). Нужно дождаться подписи второй стороны или подписать со своей стороны, если ещё не подписали.`,
      suggestedActions: ["explain_status", "open_documents"],
    };
  }
  if (!lenderDisbSet) {
    return {
      hint: "Займодавец ещё не выбрал реквизиты, с которых будет переводить деньги. До этого выдача невозможна.",
      suggestedActions: ["open_bank_details"],
    };
  }
  if (!borrowerDisbSet) {
    return {
      hint: "Заёмщик ещё не выбрал реквизиты для получения денег. До этого выдача невозможна.",
      suggestedActions: ["open_bank_details"],
    };
  }
  if (!lenderRepSet) {
    return {
      hint: "Займодавец ещё не выбрал реквизиты для приёма возврата. Заёмщик не сможет вернуть деньги, пока эти реквизиты не выбраны.",
      suggestedActions: ["open_bank_details"],
    };
  }
  if (pendingPayments > 0 && userRole === "lender") {
    return {
      hint: `Есть ${pendingPayments} перевод(а) от заёмщика, которые ждут вашего подтверждения. Откройте раздел погашений и подтвердите факт получения денег.`,
      suggestedActions: ["open_repayments"],
    };
  }
  if (pendingPayments > 0 && userRole === "borrower") {
    return {
      hint: `Ваш перевод уже отправлен и ждёт подтверждения от займодавца. Дополнительных действий пока не требуется.`,
      suggestedActions: ["open_repayments"],
    };
  }
  if (!hasConfirmedTranche && userRole === "lender") {
    return {
      hint: "Договор подписан, реквизиты готовы — займодавцу пора сделать первый перевод и затем зафиксировать его в разделе траншей.",
      suggestedActions: ["open_tranches"],
    };
  }
  if (!hasConfirmedTranche && userRole === "borrower") {
    return {
      hint: "Договор подписан, реквизиты готовы. Ждём, пока займодавец сделает перевод и зафиксирует его в разделе траншей.",
      suggestedActions: ["open_tranches"],
    };
  }
  if (outstanding > 0 && userRole === "borrower") {
    return {
      hint: `У вас остаток долга ${fmtRub(outstanding)}. Сделайте перевод по реквизитам займодавца и зафиксируйте погашение в соответствующем разделе.`,
      suggestedActions: ["open_repayments"],
    };
  }
  if (outstanding > 0 && userRole === "lender") {
    return {
      hint: `Остаток долга заёмщика ${fmtRub(outstanding)}. Ждём перевод от заёмщика — после поступления подтвердите его в разделе погашений.`,
      suggestedActions: ["open_repayments"],
    };
  }
  if (outstanding <= 0 && hasConfirmedTranche) {
    return {
      hint: "Долг полностью погашен. Можно сформировать итоговое подтверждение полного возврата в разделе документов.",
      suggestedActions: ["open_documents"],
    };
  }
  return {
    hint: "Чёткого следующего шага нет — кратко опишите текущее состояние займа человеческим языком.",
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
  const rawMessage = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!loanId || !rawMessage) return json(400, { ok: false, error: "Требуются loan_id и message" });

  // Intent: prefer explicit body.intent; fall back to legacy "INTENT:" prefix for backward compatibility.
  const ALLOWED_INTENTS = new Set(["explain_ai_check", "explain_status"]);
  const explicitIntent = typeof body?.intent === "string" && ALLOWED_INTENTS.has(body.intent) ? body.intent : null;
  const legacyMatch = rawMessage.match(/^INTENT:\s*(explain_ai_check|explain_status)\b[.,\s-]*/i);
  const intent: string | null = explicitIntent ?? (legacyMatch ? legacyMatch[1].toLowerCase() : null);
  // Strip any legacy INTENT prefix from the user-visible/logged message.
  const userMessage = legacyMatch ? rawMessage.slice(legacyMatch[0].length).trim() || rawMessage : rawMessage;
  const assistantMode = intent ? "deeper_explanation" : "normal";

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
  const latestAi = (aiChecks ?? [])[0] ?? null;
  const hasHighRiskCheck = (aiChecks ?? []).some((c) => c.risk_level === "HIGH" || c.risk_level === "BLOCKING");

  const lenderDisbSet = (allowedBank ?? []).some((b) => b.party_role === "lender" && b.purpose === "disbursement");
  const borrowerDisbSet = (allowedBank ?? []).some((b) => b.party_role === "borrower" && b.purpose === "disbursement");
  const lenderRepSet = (allowedBank ?? []).some((b) => b.party_role === "lender" && b.purpose === "repayment");
  const borrowerRepSet = (allowedBank ?? []).some((b) => b.party_role === "borrower" && b.purpose === "repayment");

  // Corrected readiness
  const trancheReady = lenderDisbSet && borrowerDisbSet;
  const repaymentReady = lenderRepSet;
  const mySideReady = userRole === "lender"
    ? (lenderDisbSet && lenderRepSet)
    : borrowerDisbSet;
  const counterpartyReady = userRole === "lender"
    ? borrowerDisbSet
    : (lenderDisbSet && lenderRepSet);

  const isFullySigned = ["fully_signed", "signed_no_debt", "active", "repaid"].includes(loan.status)
    || ((signatures ?? []).some((s) => s.role === "lender") && (signatures ?? []).some((s) => s.role === "borrower"));

  const next = computeNextActionHint({
    status: loan.status,
    userRole,
    lenderDisbSet, borrowerDisbSet, lenderRepSet, borrowerRepSet,
    outstanding,
    pendingPayments,
    hasHighRiskCheck,
    isFullySigned,
    hasConfirmedTranche,
  });

  // Build human public summary (no internal codes)
  const youAre = `Вы — ${roleLabel(userRole)}.`;
  const statusHuman = `Состояние займа: ${statusLabel(loan.status)}.`;
  const moneyLine = hasConfirmedTranche
    ? `Сумма займа ${fmtRub(Number(loan.amount))}. Выдано ${fmtRub(totalDisbursed)}, возвращено ${fmtRub(totalRepaid)}, остаток ${fmtRub(outstanding)}.`
    : `Сумма займа ${fmtRub(Number(loan.amount))}. Денег пока не выдано.`;
  let aiLine = "";
  if (latestAi) {
    const reasons = Array.isArray(latestAi.blocking_reasons) && latestAi.blocking_reasons.length
      ? ` Причины: ${(latestAi.blocking_reasons as string[]).join("; ")}.`
      : "";
    aiLine = ` Последняя проверка чека: ${riskLabel(latestAi.risk_level)}.${reasons}`;
  }
  let reqLine = "";
  if (!mySideReady) reqLine += " Не хватает ваших реквизитов.";
  else reqLine += " Ваши реквизиты выбраны.";
  if (!counterpartyReady) reqLine += " Ждём реквизиты второй стороны.";
  else reqLine += " Реквизиты второй стороны тоже готовы.";

  const publicContextSummary = `${youAre} ${statusHuman} ${moneyLine}${aiLine}${reqLine}`.trim();

  const context = {
    public_context_summary: publicContextSummary,
    contract_number: loan.contract_number,
    user_role_label: roleLabel(userRole),
    counterparty_name: userRole === "lender" ? loan.borrower_name : loan.lender_name,
    status_label: statusLabel(loan.status),
    currency: "RUB",
    currency_symbol: "₽",
    amount_display: fmtRub(Number(loan.amount)),
    repayment_date: loan.repayment_date,
    bank_details_human: {
      my_side_ready: mySideReady,
      counterparty_ready: counterpartyReady,
      lender_can_send_money: lenderDisbSet,
      borrower_can_receive_money: borrowerDisbSet,
      lender_can_receive_repayment: lenderRepSet,
      borrower_can_send_repayment: borrowerRepSet,
      tranche_ready: trancheReady,
      repayment_ready: repaymentReady,
    },
    totals: {
      total_disbursed_display: fmtRub(totalDisbursed),
      total_repaid_display: fmtRub(totalRepaid),
      outstanding_display: fmtRub(outstanding),
    },
    pending_payments_count: pendingPayments,
    tranches_human: (tranches ?? []).map((t) => ({
      n: t.tranche_number, amount_display: fmtRub(Number(t.amount)),
      state: t.status === "confirmed" ? "подтверждён" : t.status === "sent" ? "отправлен, ждёт подтверждения" : t.status === "planned" ? "запланирован" : t.status,
      check: riskLabel(t.ai_risk_level),
    })),
    payments_human: (payments ?? []).map((p) => ({
      amount_display: fmtRub(Number(p.transfer_amount)),
      state: p.status === "confirmed" ? "подтверждён займодавцем" : p.status === "pending" ? "ждёт подтверждения займодавца" : p.status,
      date: p.transfer_date,
      check: riskLabel(p.ai_risk_level),
    })),
    schedule_human: (schedule ?? []).map((s) => ({
      n: s.item_number, due: s.due_date, amount_display: fmtRub(Number(s.total_amount)),
      state: s.status === "paid" ? "оплачен" : s.status === "pending" ? "запланирован" : s.status,
    })),
    latest_ai_check_human: latestAi ? {
      what_was_checked: latestAi.entity_type === "tranche" ? "чек по выдаче транша" : latestAi.entity_type === "payment" ? "чек по возврату" : latestAi.entity_type,
      verdict: riskLabel(latestAi.risk_level),
      reasons: Array.isArray(latestAi.blocking_reasons) ? latestAi.blocking_reasons : [],
      summary: latestAi.ai_summary ?? "",
    } : null,
    documents_available: (docs ?? []).map((d) => d.document_type),
    next_action_hint: next.hint,
    assistant_mode: assistantMode,
    intent: intent,
  };

  const intentInstruction = intent === "explain_ai_check"
    ? "\nРЕЖИМ: deeper_explanation (explain_ai_check). Не повторяй прошлый ответ. Дай более глубокое объяснение последней проверки чека: что именно не так, почему это важно, блокирует ли это подтверждение, и какой именно файл нужно загрузить (российский банк, рубли, видна сумма/дата/получатель/статус «исполнено»)."
    : intent === "explain_status"
    ? "\nРЕЖИМ: deeper_explanation (explain_status). Не повторяй прошлый ответ. Объясни текущее состояние займа человеческим языком: что уже произошло, что осталось, и какой именно следующий шаг для роли пользователя."
    : "";

  const fullPrompt = `${SYSTEM_PROMPT}

ВАЖНО: Используй public_context_summary как основу ответа. Не цитируй имена JSON-полей и внутренние коды. Все суммы в RUB.${intentInstruction}

КОНТЕКСТ ЗАЙМА (JSON, только для твоего понимания):
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
      request_message: `[loan:${loanId}]${intent ? `[intent:${intent}]` : ""} ${userMessage}`,
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
  const cleanAnswer = sanitizeOutput(cleanedAnswerRaw);
  const modelActions = extractActions(answer ?? "");

  // Contextual suggested actions
  const contextual: string[] = [];
  if (hasHighRiskCheck) contextual.push("explain_ai_check");
  if (!mySideReady || !counterpartyReady) contextual.push("open_bank_details");
  if (pendingPayments > 0) contextual.push("open_repayments");
  if (outstanding > 0 && hasConfirmedTranche) contextual.push("open_repayments");
  if (!isFullySigned) contextual.push("explain_status");
  if (!hasConfirmedTranche && isFullySigned) contextual.push("open_tranches");

  const suggested_actions = Array.from(new Set([
    ...modelActions,
    ...next.suggestedActions,
    ...contextual,
  ])).slice(0, 3);

  return json(200, {
    ok: true,
    answer: cleanAnswer,
    suggested_actions,
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens },
    duration_ms: duration,
  });
});
