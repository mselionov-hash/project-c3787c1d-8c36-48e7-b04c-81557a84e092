/**
 * Runtime text template: Подтверждение полного погашения
 * Source-aligned with TZ v2.2 legal source pack.
 * Generated when the outstanding balance reaches zero after a confirmed repayment.
 *
 * Placeholders use {VARIABLE_NAME} syntax.
 * Conditional blocks use [[IF {VAR} == VALUE]] ... [[ENDIF]] syntax.
 *
 * DO NOT simplify or alter the legal wording.
 */

export const FULL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION = '1.0';

export const FULL_REPAYMENT_CONFIRMATION_TEMPLATE = `# Подтверждение полного погашения
# по Договору денежного займа № {CONTRACT_NUMBER}

Дата формирования: {CONFIRMATION_DATE}

[[IF {HAS_CLOSING_PAYMENT_ID} == YES]]
Идентификатор закрывающего платежа: {CLOSING_PAYMENT_ID}
[[ENDIF]]

[[IF {HAS_SUPERSEDES_DOCUMENT_ID} == YES]]
Настоящее подтверждение заменяет ранее выданное подтверждение: {SUPERSEDES_DOCUMENT_ID}
[[ENDIF]]

---

## 1. Сведения о Сторонах

**Займодавец:** {LENDER_FULL_NAME}, паспорт: серия {LENDER_PASSPORT_SERIES} № {LENDER_PASSPORT_NUMBER}, адрес регистрации: {LENDER_REG_ADDRESS}, ID учетной записи на Платформе: {LENDER_APP_ACCOUNT_ID}.

**Заёмщик:** {BORROWER_FULL_NAME}, паспорт: серия {BORROWER_PASSPORT_SERIES} № {BORROWER_PASSPORT_NUMBER}, адрес регистрации: {BORROWER_REG_ADDRESS}, ID учетной записи на Платформе: {BORROWER_APP_ACCOUNT_ID}.

## 2. Сведения о закрывающем платеже

Сумма закрывающего платежа: **{CLOSING_PAYMENT_AMOUNT} ({CLOSING_PAYMENT_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}**
Дата перевода: {CLOSING_PAYMENT_DATE}
Способ перевода: {CLOSING_PAYMENT_METHOD}

[[IF {CLOSING_PAYMENT_METHOD} == BANK_TRANSFER]]
Банковский перевод с реквизита Заёмщика {CLOSING_SENDER_ACCOUNT_DISPLAY} на реквизит Займодавца {CLOSING_RECEIVER_ACCOUNT_DISPLAY}.
[[ENDIF]]

[[IF {CLOSING_PAYMENT_METHOD} == SBP]]
Перевод через СБП с реквизита Заёмщика {CLOSING_SENDER_ACCOUNT_DISPLAY} на реквизит Займодавца {CLOSING_RECEIVER_ACCOUNT_DISPLAY}.
[[ENDIF]]

[[IF {HAS_CLOSING_TRANSACTION_ID} == YES]]
ID транзакции: {CLOSING_TRANSACTION_ID}
[[ENDIF]]

## 3. Распределение закрывающего платежа

Зачтено в основной долг: **{CLOSING_ALLOCATED_PRINCIPAL} {LOAN_CURRENCY}**
Зачтено в проценты: **{CLOSING_ALLOCATED_INTEREST} {LOAN_CURRENCY}**
Зачтено в проценты по ст. 395 ГК РФ: **{CLOSING_ALLOCATED_395} {LOAN_CURRENCY}**
Зачтено в иные расходы: **{CLOSING_ALLOCATED_COSTS} {LOAN_CURRENCY}**
Итого зачтено: **{CLOSING_PAYMENT_AMOUNT} {LOAN_CURRENCY}**

## 4. Исполнение обязательств

Общая сумма выданных траншей: **{TOTAL_DISBURSED} ({TOTAL_DISBURSED_IN_WORDS}) {LOAN_CURRENCY}**
Общая сумма подтверждённых погашений: **{TOTAL_REPAID} ({TOTAL_REPAID_IN_WORDS}) {LOAN_CURRENCY}**
Дата последнего платежа: {LAST_REPAYMENT_DATE}

Остаток основного долга: **0 {LOAN_CURRENCY}**
Остаток начисленных процентов: **0 {LOAN_CURRENCY}**
Остаток процентов по ст. 395 ГК РФ: **0 {LOAN_CURRENCY}**
Иные расходы: **0 {LOAN_CURRENCY}**
**Итого задолженность: 0 {LOAN_CURRENCY}**

## 5. Статус Договора

Все денежные обязательства Заёмщика по возврату основной суммы займа считаются исполненными в полном объёме.

Статус Договора на Платформе: **CLOSED** (полностью погашен).

[[IF {INTEREST_MODE} == FIXED_RATE]]
Настоящее подтверждение не распространяется на обязательства по уплате процентов, неустойки или иных сумм, если таковые предусмотрены Договором и не были уплачены на дату настоящего подтверждения, за исключением случая, когда общий итог задолженности по процентам, неустойке и иным суммам также равен нулю.
[[ENDIF]]

[[IF {INTEREST_MODE} == INTEREST_FREE]]
Заём являлся беспроцентным. Дополнительных обязательств по уплате процентов не возникало.
[[ENDIF]]

[[IF {HAS_SCHEDULE} == YES]]
## 6. Связь с Графиком возврата (Приложение № 2)

На дату формирования настоящего подтверждения все пункты Графика возврата (Приложение № 2) считаются исполненными.
[[ENDIF]]

## 7. Подтверждение

Настоящим Займодавец подтверждает, что Заёмщик полностью исполнил обязательства по возврату основной суммы долга по Договору денежного займа № {CONTRACT_NUMBER}.

[[IF {SIGNATURE_SCHEME_REQUESTED} == UNEP_WITH_APPENDIX_6]]
Настоящее подтверждение подписано простой электронной подписью (УНЭП) в соответствии с Приложением № 6 к Договору.
[[ENDIF]]

[[IF {SIGNATURE_SCHEME_REQUESTED} == UKEP_ONLY]]
Настоящее подтверждение подписано УКЭП Займодавца.
[[ENDIF]]

---

## Подпись Займодавца

ФИО: {LENDER_FULL_NAME}
ID учетной записи на Платформе: {LENDER_APP_ACCOUNT_ID}
Подпись: {LENDER_CONFIRMATION_BLOCK}
`;

export const FULL_REPAYMENT_CONFIRMATION_VARIABLES = [
  'CONTRACT_NUMBER',
  'CONFIRMATION_DATE',
  'HAS_CLOSING_PAYMENT_ID', 'CLOSING_PAYMENT_ID',
  'HAS_SUPERSEDES_DOCUMENT_ID', 'SUPERSEDES_DOCUMENT_ID',
  'LENDER_FULL_NAME', 'LENDER_PASSPORT_SERIES', 'LENDER_PASSPORT_NUMBER',
  'LENDER_REG_ADDRESS', 'LENDER_APP_ACCOUNT_ID',
  'BORROWER_FULL_NAME', 'BORROWER_PASSPORT_SERIES', 'BORROWER_PASSPORT_NUMBER',
  'BORROWER_REG_ADDRESS', 'BORROWER_APP_ACCOUNT_ID',
  'CLOSING_PAYMENT_AMOUNT', 'CLOSING_PAYMENT_AMOUNT_IN_WORDS', 'LOAN_CURRENCY',
  'CLOSING_PAYMENT_DATE', 'CLOSING_PAYMENT_METHOD',
  'CLOSING_SENDER_ACCOUNT_DISPLAY', 'CLOSING_RECEIVER_ACCOUNT_DISPLAY',
  'HAS_CLOSING_TRANSACTION_ID', 'CLOSING_TRANSACTION_ID',
  'CLOSING_ALLOCATED_PRINCIPAL', 'CLOSING_ALLOCATED_INTEREST',
  'CLOSING_ALLOCATED_395', 'CLOSING_ALLOCATED_COSTS',
  'TOTAL_DISBURSED', 'TOTAL_DISBURSED_IN_WORDS',
  'TOTAL_REPAID', 'TOTAL_REPAID_IN_WORDS',
  'LAST_REPAYMENT_DATE',
  'INTEREST_MODE',
  'HAS_SCHEDULE',
  'SIGNATURE_SCHEME_REQUESTED',
  'LENDER_CONFIRMATION_BLOCK',
] as const;
