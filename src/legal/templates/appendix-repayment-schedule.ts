/**
 * Runtime text template: Приложение 2 — График погашения
 * Variables: contract_number, schedule_items[] (item_number, due_date,
 *   principal_amount, interest_amount, total_amount)
 *
 * TODO: Final legal text to be defined in Phase 4.
 * This is a safe placeholder. Do not use for production document generation.
 */

export const APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE_VERSION = '0.1-placeholder';

export const APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE = `Приложение № 2
к Договору денежного займа № {CONTRACT_NUMBER}

График погашения займа

<!-- TODO: Phase 4 — final legal text with schedule table:
  | № | Дата платежа | Основной долг | Проценты | Итого |
  Conditional on REPAYMENT_SCHEDULE_TYPE (INSTALLMENTS_FIXED / INSTALLMENTS_VARIABLE)
-->

[Placeholder — awaiting final legal text]
`;

export const APPENDIX_REPAYMENT_SCHEDULE_VARIABLES = [
  'CONTRACT_NUMBER',
] as const;
