/**
 * Runtime text template: Подтверждение полного погашения
 * Generated when the outstanding balance reaches zero after a confirmed repayment.
 */

export const FULL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION = '1.0';

export const FULL_REPAYMENT_CONFIRMATION_TEMPLATE = `Подтверждение полного погашения
по Договору денежного займа № {CONTRACT_NUMBER}

Дата формирования: {CONFIRMATION_DATE}

1. Сведения о Сторонах

Займодавец: {LENDER_FULL_NAME}, паспорт: серия {LENDER_PASSPORT_SERIES} № {LENDER_PASSPORT_NUMBER}
Адрес регистрации: {LENDER_REG_ADDRESS}

Заёмщик: {BORROWER_FULL_NAME}, паспорт: серия {BORROWER_PASSPORT_SERIES} № {BORROWER_PASSPORT_NUMBER}
Адрес регистрации: {BORROWER_REG_ADDRESS}

2. Исполнение обязательств

Общая сумма выданных траншей: {TOTAL_DISBURSED} ({TOTAL_DISBURSED_IN_WORDS}) {LOAN_CURRENCY}
Общая сумма подтверждённых погашений: {TOTAL_REPAID} ({TOTAL_REPAID_IN_WORDS}) {LOAN_CURRENCY}
Дата последнего платежа: {LAST_REPAYMENT_DATE}
Остаток основного долга: 0 {LOAN_CURRENCY}

3. Подтверждение

Настоящим Займодавец подтверждает, что Заёмщик полностью исполнил обязательства по возврату основной суммы долга по Договору денежного займа № {CONTRACT_NUMBER}.

Все денежные обязательства Заёмщика по возврату основной суммы займа считаются исполненными в полном объёме.

Настоящее подтверждение не распространяется на обязательства по уплате процентов, неустойки или иных сумм, если таковые предусмотрены Договором и не были уплачены на дату настоящего подтверждения.

Подпись Займодавца: {LENDER_CONFIRMATION_BLOCK}
`;

export const FULL_REPAYMENT_CONFIRMATION_VARIABLES = [
  'CONTRACT_NUMBER',
  'CONFIRMATION_DATE',
  'LENDER_FULL_NAME',
  'LENDER_PASSPORT_SERIES',
  'LENDER_PASSPORT_NUMBER',
  'LENDER_REG_ADDRESS',
  'BORROWER_FULL_NAME',
  'BORROWER_PASSPORT_SERIES',
  'BORROWER_PASSPORT_NUMBER',
  'BORROWER_REG_ADDRESS',
  'TOTAL_DISBURSED',
  'TOTAL_DISBURSED_IN_WORDS',
  'TOTAL_REPAID',
  'TOTAL_REPAID_IN_WORDS',
  'LOAN_CURRENCY',
  'LAST_REPAYMENT_DATE',
  'LENDER_CONFIRMATION_BLOCK',
] as const;
