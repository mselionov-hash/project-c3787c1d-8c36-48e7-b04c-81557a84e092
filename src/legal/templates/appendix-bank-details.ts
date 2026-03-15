/**
 * Runtime text template: Приложение 1 — Допустимые банковские реквизиты
 * Variables: contract_number, lender_bank_details[], borrower_bank_details[],
 *   disbursement_details[], repayment_details[]
 *
 * TODO: Final legal text to be defined in Phase 4.
 * This is a safe placeholder. Do not use for production document generation.
 */

export const APPENDIX_BANK_DETAILS_TEMPLATE_VERSION = '0.1-placeholder';

export const APPENDIX_BANK_DETAILS_TEMPLATE = `Приложение № 1
к Договору денежного займа № {CONTRACT_NUMBER}

Допустимые банковские реквизиты для выдачи и погашения займа

<!-- TODO: Phase 4 — final legal text with 4 sections:
  1. Допустимые реквизиты Займодавца для выдачи (перечисления) Транша
  2. Допустимые реквизиты Заёмщика для получения Транша
  3. Допустимые реквизиты Займодавца для получения возврата
  4. Снэпшот контактных данных Сторон для уведомлений
-->

[Placeholder — awaiting final legal text]
`;

export const APPENDIX_BANK_DETAILS_VARIABLES = [
  'CONTRACT_NUMBER',
] as const;
