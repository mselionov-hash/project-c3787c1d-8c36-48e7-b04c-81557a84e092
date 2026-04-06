/**
 * Platform configuration constants for legal document generation.
 * These values are hardcoded for the MVP and will be configurable later.
 *
 * IMPORTANT: No field may contain placeholder markers like [—], [не указано], etc.
 * All values must be production-ready or left empty with a valid legal fallback.
 */

export const PLATFORM_CONFIG = {
  // ── Core platform identity ──────────────────────────────────────
  PLATFORM_NAME: 'Займы Онлайн',
  PLATFORM_BRAND_NAME: 'Займы Онлайн',
  PLATFORM_URL: 'https://p2p-dostupnye-dengi.lovable.app',
  PLATFORM_OPERATOR_NAME: 'ИП Оператор Платформы «Займы Онлайн»',
  PLATFORM_OPERATOR_LEGAL_DETAILS: 'ИП Оператор Платформы «Займы Онлайн»',
  SUPPORT_CONTACTS_TEXT: 'support@p2p-dostupnye-dengi.lovable.app',

  // ── Loan defaults ───────────────────────────────────────────────
  LOAN_CURRENCY: 'руб.',
  DAY_COUNT_BASIS: 'фактическое количество календарных дней; 365/366',
  DISBURSEMENT_REFERENCE_RULE: '«Перевод по договору займа № [номер договора]»',
  PAYMENT_REFERENCE_RULE: '«Возврат по договору займа № [номер договора]»',

  // ── Signature / UNEP defaults ───────────────────────────────────
  LENDER_CO_SIGNATURE_ENABLED: 'NO',
  PAYMENT_PROOF_ATTACHMENT_ENABLED: 'NO',

  // ── Document titles ─────────────────────────────────────────────
  RECEIPT_TITLE: 'Расписка о получении Транша',

  // ── TZ v2.2 new config fields ───────────────────────────────────
  LOAN_TYPE: 'INDIVIDUAL_TO_INDIVIDUAL',
  CONTRACT_LANGUAGE: 'ru',
  INTEREST_ACCRUAL_START: 'FROM_EACH_TRANCHE_DATE',
  EARLY_REPAYMENT_INTEREST_RULE: 'ACCRUED_TO_DATE',
} as const;
