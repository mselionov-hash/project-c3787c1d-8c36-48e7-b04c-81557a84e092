/**
 * Runtime text template: Подтверждение частичного погашения
 * Source-aligned with TZ v2.2 legal source pack.
 * Generated when lender confirms a repayment and outstanding balance > 0.
 *
 * Placeholders use {VARIABLE_NAME} syntax.
 * Conditional blocks use [[IF {VAR} == VALUE]] ... [[ENDIF]] syntax.
 *
 * DO NOT simplify or alter the legal wording.
 */

export const PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION = '1.0';

export const PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE = `# Подтверждение частичного погашения
# по Договору денежного займа № {CONTRACT_NUMBER}

Дата формирования: {CONFIRMATION_DATE}
Идентификатор платежа: {REPAYMENT_PAYMENT_ID}

[[IF {HAS_REPAYMENT_REQUEST_ID} == YES]]
Идентификатор запроса на погашение: {REPAYMENT_REQUEST_ID}
[[ENDIF]]

---

## 1. Сведения о Сторонах

**Займодавец:** {LENDER_FULL_NAME}, паспорт: серия {LENDER_PASSPORT_SERIES} № {LENDER_PASSPORT_NUMBER}, адрес регистрации: {LENDER_REG_ADDRESS}, ID учетной записи на Платформе: {LENDER_APP_ACCOUNT_ID}.

**Заёмщик:** {BORROWER_FULL_NAME}, паспорт: серия {BORROWER_PASSPORT_SERIES} № {BORROWER_PASSPORT_NUMBER}, адрес регистрации: {BORROWER_REG_ADDRESS}, ID учетной записи на Платформе: {BORROWER_APP_ACCOUNT_ID}.

## 2. Сведения о платеже

Сумма платежа: **{REPAYMENT_AMOUNT} ({REPAYMENT_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}**
Дата перевода: {REPAYMENT_DATE}
Способ перевода: {REPAYMENT_METHOD}

[[IF {REPAYMENT_METHOD} == BANK_TRANSFER]]
Банковский перевод с реквизита Заёмщика {REPAYMENT_SENDER_ACCOUNT_DISPLAY} на реквизит Займодавца {REPAYMENT_RECEIVER_ACCOUNT_DISPLAY}.
[[ENDIF]]

[[IF {REPAYMENT_METHOD} == SBP]]
Перевод через СБП с реквизита Заёмщика {REPAYMENT_SENDER_ACCOUNT_DISPLAY} на реквизит Займодавца {REPAYMENT_RECEIVER_ACCOUNT_DISPLAY}.
[[ENDIF]]

[[IF {HAS_BANK_NAME} == YES]]
Банк: {REPAYMENT_BANK_NAME}
[[ENDIF]]

[[IF {HAS_TRANSACTION_ID} == YES]]
ID транзакции: {REPAYMENT_TRANSACTION_ID}
[[ENDIF]]

Назначение платежа: {REPAYMENT_REFERENCE_TEXT}

## 3. Распределение платежа

Зачтено в основной долг: **{REPAYMENT_ALLOCATED_PRINCIPAL} {LOAN_CURRENCY}**
Зачтено в проценты: **{REPAYMENT_ALLOCATED_INTEREST} {LOAN_CURRENCY}**
Зачтено в проценты по ст. 395 ГК РФ: **{REPAYMENT_ALLOCATED_395} {LOAN_CURRENCY}**
Зачтено в иные расходы: **{REPAYMENT_ALLOCATED_COSTS} {LOAN_CURRENCY}**
Итого зачтено: **{REPAYMENT_AMOUNT} {LOAN_CURRENCY}**

## 4. Состояние задолженности после платежа

Общая сумма выданных траншей: **{TOTAL_DISBURSED} {LOAN_CURRENCY}**
Общая сумма подтверждённых погашений (включая текущий): **{TOTAL_REPAID} {LOAN_CURRENCY}**

Остаток основного долга: **{OUTSTANDING_PRINCIPAL} {LOAN_CURRENCY}**
Остаток начисленных процентов: **{OUTSTANDING_INTEREST} {LOAN_CURRENCY}**
Остаток процентов по ст. 395 ГК РФ: **{OUTSTANDING_395_INTEREST} {LOAN_CURRENCY}**
Иные расходы: **{OUTSTANDING_COSTS} {LOAN_CURRENCY}**
**Итого задолженность: {ACTIVE_DEBT_AMOUNT} {LOAN_CURRENCY}**

[[IF {HAS_SCHEDULE} == YES]]
## 5. Связь с Графиком возврата (Приложение № 2)

[[IF {HAS_SCHEDULE_ITEM_ID} == YES]]
Платёж привязан к пункту Графика возврата № {REPAYMENT_SCHEDULE_ITEM_NUMBER} (срок оплаты: {REPAYMENT_SCHEDULE_ITEM_DUE_DATE}).
[[ENDIF]]

[[IF {HAS_SCHEDULE_ITEM_ID} == NO]]
Платёж не привязан к конкретному пункту Графика возврата.
[[ENDIF]]

Состояние графика после платежа: актуализированные данные отражены в текущей редакции Приложения № 2.
[[ENDIF]]

## 6. Подтверждение

Настоящим Займодавец подтверждает получение от Заёмщика указанного выше платежа в счёт частичного погашения задолженности по Договору денежного займа № {CONTRACT_NUMBER}.

Данное подтверждение не является признанием общей суммы задолженности, процентов или иных сумм по Договору сверх сведений, указанных в настоящем документе.

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

export const PARTIAL_REPAYMENT_CONFIRMATION_VARIABLES = [
  'CONTRACT_NUMBER',
  'CONFIRMATION_DATE',
  'REPAYMENT_PAYMENT_ID',
  'HAS_REPAYMENT_REQUEST_ID', 'REPAYMENT_REQUEST_ID',
  'LENDER_FULL_NAME', 'LENDER_PASSPORT_SERIES', 'LENDER_PASSPORT_NUMBER',
  'LENDER_REG_ADDRESS', 'LENDER_APP_ACCOUNT_ID',
  'BORROWER_FULL_NAME', 'BORROWER_PASSPORT_SERIES', 'BORROWER_PASSPORT_NUMBER',
  'BORROWER_REG_ADDRESS', 'BORROWER_APP_ACCOUNT_ID',
  'REPAYMENT_AMOUNT', 'REPAYMENT_AMOUNT_IN_WORDS', 'LOAN_CURRENCY',
  'REPAYMENT_DATE', 'REPAYMENT_METHOD',
  'REPAYMENT_SENDER_ACCOUNT_DISPLAY', 'REPAYMENT_RECEIVER_ACCOUNT_DISPLAY',
  'HAS_BANK_NAME', 'REPAYMENT_BANK_NAME',
  'HAS_TRANSACTION_ID', 'REPAYMENT_TRANSACTION_ID',
  'REPAYMENT_REFERENCE_TEXT',
  'REPAYMENT_ALLOCATED_PRINCIPAL', 'REPAYMENT_ALLOCATED_INTEREST',
  'REPAYMENT_ALLOCATED_395', 'REPAYMENT_ALLOCATED_COSTS',
  'TOTAL_DISBURSED', 'TOTAL_REPAID',
  'OUTSTANDING_PRINCIPAL', 'OUTSTANDING_INTEREST',
  'OUTSTANDING_395_INTEREST', 'OUTSTANDING_COSTS', 'ACTIVE_DEBT_AMOUNT',
  'HAS_SCHEDULE', 'HAS_SCHEDULE_ITEM_ID',
  'REPAYMENT_SCHEDULE_ITEM_NUMBER', 'REPAYMENT_SCHEDULE_ITEM_DUE_DATE',
  'SIGNATURE_SCHEME_REQUESTED',
  'LENDER_CONFIRMATION_BLOCK',
] as const;
