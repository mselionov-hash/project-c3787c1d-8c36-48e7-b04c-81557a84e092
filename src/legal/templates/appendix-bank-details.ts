/**
 * Runtime text template: Приложение 1 — Допустимые реквизиты и контактный снапшот Сторон
 * Generated from signing-time snapshot data.
 */

export const APPENDIX_BANK_DETAILS_TEMPLATE_VERSION = '1.0';

export const APPENDIX_BANK_DETAILS_TEMPLATE = `Приложение № 1
к Договору денежного займа № {CONTRACT_NUMBER}

Допустимые банковские реквизиты для выдачи и погашения займа

Дата формирования: {APPENDIX_DATE}

1. Допустимые реквизиты Займодавца для выдачи (перечисления) Транша

{LENDER_DISBURSEMENT_ACCOUNTS}

2. Допустимые реквизиты Заёмщика для получения Транша

{BORROWER_DISBURSEMENT_ACCOUNTS}

3. Допустимые реквизиты Займодавца для получения возврата займа

{LENDER_REPAYMENT_ACCOUNTS}

4. Допустимые реквизиты Заёмщика для осуществления возврата займа

{BORROWER_REPAYMENT_ACCOUNTS}

5. Контактный снапшот Сторон для уведомлений

{NOTICE_SNAPSHOT_TABLE}

Настоящее Приложение является неотъемлемой частью Договора денежного займа № {CONTRACT_NUMBER}.

Изменение Допустимых реквизитов после подписания Договора допускается только путём оформления дополнительного соглашения, подписанного обеими Сторонами.
`;

export const APPENDIX_BANK_DETAILS_VARIABLES = [
  'CONTRACT_NUMBER',
  'APPENDIX_DATE',
  'LENDER_DISBURSEMENT_ACCOUNTS',
  'BORROWER_DISBURSEMENT_ACCOUNTS',
  'LENDER_REPAYMENT_ACCOUNTS',
  'BORROWER_REPAYMENT_ACCOUNTS',
  'NOTICE_SNAPSHOT_TABLE',
] as const;
