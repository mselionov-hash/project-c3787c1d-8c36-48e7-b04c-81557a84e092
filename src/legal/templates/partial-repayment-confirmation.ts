/**
 * Runtime text template: Подтверждение частичного погашения
 * Generated when lender confirms a repayment and outstanding balance > 0.
 */

export const PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION = '1.0';

export const PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE = `Подтверждение частичного погашения
по Договору денежного займа № {CONTRACT_NUMBER}

Дата формирования: {CONFIRMATION_DATE}

1. Сведения о Сторонах

Займодавец: {LENDER_FULL_NAME}
Заёмщик: {BORROWER_FULL_NAME}

2. Сведения о платеже

Сумма платежа: {REPAYMENT_AMOUNT} ({REPAYMENT_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}
Дата перевода: {REPAYMENT_DATE}
Способ перевода: {REPAYMENT_METHOD}
[[IF {HAS_BANK_NAME} == YES]]
Банк: {REPAYMENT_BANK_NAME}
[[ENDIF]]
[[IF {HAS_TRANSACTION_ID} == YES]]
ID транзакции: {REPAYMENT_TRANSACTION_ID}
[[ENDIF]]

3. Состояние задолженности

Общая сумма выданных траншей: {TOTAL_DISBURSED} {LOAN_CURRENCY}
Общая сумма подтверждённых погашений (включая текущий): {TOTAL_REPAID} {LOAN_CURRENCY}
Остаток основного долга: {REMAINING_BALANCE} {LOAN_CURRENCY}

4. Подтверждение

Настоящим Займодавец подтверждает получение от Заёмщика указанного выше платежа в счёт частичного погашения задолженности по Договору денежного займа № {CONTRACT_NUMBER}.

Данное подтверждение не является признанием общей суммы задолженности, процентов или иных сумм по Договору сверх сведений, указанных в настоящем документе.

Подпись Займодавца: {LENDER_CONFIRMATION_BLOCK}
`;

export const PARTIAL_REPAYMENT_CONFIRMATION_VARIABLES = [
  'CONTRACT_NUMBER',
  'CONFIRMATION_DATE',
  'LENDER_FULL_NAME',
  'BORROWER_FULL_NAME',
  'REPAYMENT_AMOUNT',
  'REPAYMENT_AMOUNT_IN_WORDS',
  'LOAN_CURRENCY',
  'REPAYMENT_DATE',
  'REPAYMENT_METHOD',
  'REPAYMENT_BANK_NAME',
  'REPAYMENT_TRANSACTION_ID',
  'TOTAL_DISBURSED',
  'TOTAL_REPAID',
  'REMAINING_BALANCE',
  'LENDER_CONFIRMATION_BLOCK',
] as const;
