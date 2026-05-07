import type { AiAnalysisResult, AiCheck } from '@/components/AiPaymentProofCheck';

export type EntityKind = 'tranche' | 'repayment';

export interface CriticalValidation {
  ok: boolean;
  reasons: string[];
  /** True if file class itself is invalid (foreign/non-payment/cancelled/dup/limit/non-RUB).
   *  In these cases manual fallback must NOT be allowed to bypass. */
  hardClassificationFail: boolean;
}

const RUB_CURRENCIES = new Set(['RUB', 'RUR', '₽']);

const findCheck = (checks: AiCheck[] | undefined, id: string): AiCheck | undefined =>
  (checks ?? []).find((c) => c.id === id);

export function isAiProofCriticallyValid(
  result: AiAnalysisResult | null,
  entity: EntityKind,
): CriticalValidation {
  const reasons: string[] = [];
  let hardClassificationFail = false;

  if (!result || !result.ok) {
    return { ok: false, reasons: ['AI-проверка не выполнена.'], hardClassificationFail: false };
  }

  const cls = result.document_classification ?? {};
  const ex = result.extracted ?? {};
  const checks = result.checks ?? [];

  if (result.risk_level === 'BLOCKING') {
    reasons.push('AI вернул блокирующий результат.');
  }
  if (result.risk_level === 'HIGH') {
    reasons.push('AI вернул высокий уровень риска.');
  }

  if (cls.is_payment_proof !== true) {
    reasons.push('Файл не является платежным подтверждением.');
    hardClassificationFail = true;
  }
  if (cls.is_russian_bank_receipt !== true) {
    reasons.push('Документ не является чеком российского банка.');
    hardClassificationFail = true;
  }

  const cur = ex.currency ? String(ex.currency).toUpperCase().trim() : '';
  if (!cur || !RUB_CURRENCIES.has(cur)) {
    reasons.push('Валюта платежа не RUB.');
    hardClassificationFail = true;
  }

  if (cls.payment_status && cls.payment_status !== 'completed') {
    reasons.push(`Операция не исполнена (статус: ${cls.payment_status}).`);
    hardClassificationFail = true;
  }
  if (!cls.payment_status) {
    reasons.push('Статус операции не подтверждён как «исполнена».');
  }

  // Critical deterministic checks
  const amountMatch = findCheck(checks, 'amount_match');
  if (amountMatch && amountMatch.level !== 'ok') {
    reasons.push('Сумма в чеке не совпадает с ожидаемой.');
  }

  const dup = findCheck(checks, 'duplicate_operation_id');
  if (dup && dup.level !== 'ok') {
    reasons.push('ID операции уже использовался по этому договору.');
    hardClassificationFail = true;
  }

  if (entity === 'tranche') {
    const limit = findCheck(checks, 'loan_limit');
    if (limit && limit.level !== 'ok') {
      reasons.push('Сумма транша превысит лимит договора.');
      hardClassificationFail = true;
    }
  }

  // Any blocking-level check is a hard fail.
  if (checks.some((c) => c.level === 'blocking')) {
    if (!reasons.includes('AI вернул блокирующий результат.')) {
      reasons.push('Одна из критических проверок заблокирована.');
    }
  }

  // High-level checks on critical fields
  const criticalIds = new Set(['amount_match', 'currency_match', 'payment_status', 'duplicate_operation_id', 'loan_limit', 'is_payment_proof', 'is_russian_bank_receipt']);
  for (const c of checks) {
    if (c.level === 'high' && criticalIds.has(c.id)) {
      reasons.push(c.message);
    }
  }

  return { ok: reasons.length === 0, reasons: Array.from(new Set(reasons)), hardClassificationFail };
}

/**
 * Whether the manual fallback is allowed.
 * Manual fallback may be used only when AI failed to read or returned low confidence,
 * NEVER to bypass a hard classification fail (foreign / not-payment / wrong currency /
 * cancelled / failed / pending / duplicate / loan limit).
 */
export function isManualFallbackAllowed(result: AiAnalysisResult | null, entity: EntityKind): boolean {
  if (!result) return true; // no AI yet
  if (!result.ok) return true; // AI errored
  const v = isAiProofCriticallyValid(result, entity);
  return !v.hardClassificationFail;
}
