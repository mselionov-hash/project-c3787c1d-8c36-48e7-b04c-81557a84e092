/**
 * Platform configuration constants for legal document generation.
 * These values are hardcoded for the MVP and will be configurable later.
 */

export const PLATFORM_CONFIG = {
  PLATFORM_NAME: 'Займы Онлайн',
  PLATFORM_URL: 'https://loans.lovable.app',
  PLATFORM_OPERATOR_NAME: 'ИП Оператор Платформы',
  LOAN_CURRENCY: 'руб.',
  DAY_COUNT_BASIS: 'фактическое количество календарных дней; 365/366',
  DISBURSEMENT_REFERENCE_RULE: '«Перевод по договору займа № [номер договора]»',
  PAYMENT_REFERENCE_RULE: '«Возврат по договору займа № [номер договора]»',
  LENDER_CO_SIGNATURE_ENABLED: 'NO',
  PAYMENT_PROOF_ATTACHMENT_ENABLED: 'NO',
  RECEIPT_TITLE: 'Расписка о получении Транша',
} as const;
