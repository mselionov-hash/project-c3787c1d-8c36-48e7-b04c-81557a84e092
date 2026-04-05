/**
 * Runtime text template: Приложение 2 — График погашения
 * Source-aligned with TZ v2.2 legal source pack.
 * Generated only when repayment_schedule_type is INSTALLMENTS_FIXED or INSTALLMENTS_VARIABLE.
 *
 * Placeholders use {VARIABLE_NAME} syntax.
 * Conditional blocks use [[IF {VAR} == VALUE]] ... [[ENDIF]] syntax.
 *
 * DO NOT simplify or alter the legal wording.
 */

export const APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE_VERSION = '1.0';

export const APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE = `# Приложение № 2
# к Договору денежного займа № {CONTRACT_NUMBER}

## График погашения займа

Дата формирования: {APPENDIX_DATE}

Редакция №: {APP2_EDITION_NUMBER}
Вид редакции: {APP2_EDITION_KIND}
Источник формирования: {APP2_GENERATION_SOURCE}

[[IF {APP2_EDITION_KIND} == RECALCULATED]]
Причина пересчёта: {APP2_RECALCULATION_REASON}
Предыдущая редакция от: {APP2_PREVIOUS_EDITION_DATE}
[[ENDIF]]

---

## 1. Параметры графика

Тип графика: **{SCHEDULE_TYPE_LABEL}**

Предельная сумма займа: **{LOAN_AMOUNT} ({LOAN_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}**

[[IF {INTEREST_MODE} == FIXED_RATE]]
Процентная ставка: **{INTEREST_RATE_ANNUAL}% годовых**
[[ENDIF]]

[[IF {INTEREST_MODE} == INTEREST_FREE]]
Заём является беспроцентным.
[[ENDIF]]

Дата окончательного возврата: **{FINAL_REPAYMENT_DEADLINE}**

## 2. Таблица платежей

{SCHEDULE_TABLE}

## 3. Итоговые суммы по графику

Итого основной долг по графику: **{SCHEDULE_TOTAL_PRINCIPAL} {LOAN_CURRENCY}**
Итого проценты по графику: **{SCHEDULE_TOTAL_INTEREST} {LOAN_CURRENCY}**
Итого по графику: **{SCHEDULE_TOTAL_AMOUNT} {LOAN_CURRENCY}**

## 4. Примечания

4.1. Суммы указаны исходя из Предельной суммы займа. Если фактически предоставленная сумма займа окажется меньше, обязательства Заёмщика определяются исходя из фактически предоставленной и непогашенной суммы.

4.2. При частичном досрочном погашении оставшиеся платежи подлежат пересчёту. Платформа формирует новую редакцию настоящего Приложения с актуализированными суммами.

4.3. В случае расхождения между данными настоящего Графика и условиями Договора приоритет имеют условия Договора.

[[IF {APP2_EDITION_KIND} == SIGNED]]
4.4. Настоящая редакция Графика подписана обеими Сторонами и является обязательной.
[[ENDIF]]

[[IF {APP2_EDITION_KIND} == DERIVED]]
4.4. Настоящая редакция Графика сформирована автоматически на основании условий Договора. Она носит информационный характер до момента подписания обеими Сторонами.
[[ENDIF]]

## 5. Заключительные положения

Настоящее Приложение является неотъемлемой частью Договора денежного займа № {CONTRACT_NUMBER}.

---

## Подписи Сторон

**Займодавец:**
ФИО: {LENDER_FULL_NAME}
ID учетной записи на Платформе: {LENDER_APP_ACCOUNT_ID}
Подпись: {LENDER_SIGNATURE_BLOCK}

**Заёмщик:**
ФИО: {BORROWER_FULL_NAME}
ID учетной записи на Платформе: {BORROWER_APP_ACCOUNT_ID}
Подпись: {BORROWER_SIGNATURE_BLOCK}
`;

export const APPENDIX_REPAYMENT_SCHEDULE_VARIABLES = [
  'CONTRACT_NUMBER',
  'APPENDIX_DATE',
  'APP2_EDITION_NUMBER',
  'APP2_EDITION_KIND',
  'APP2_GENERATION_SOURCE',
  'APP2_RECALCULATION_REASON',
  'APP2_PREVIOUS_EDITION_DATE',
  'SCHEDULE_TYPE_LABEL',
  'LOAN_AMOUNT', 'LOAN_AMOUNT_IN_WORDS', 'LOAN_CURRENCY',
  'INTEREST_MODE', 'INTEREST_RATE_ANNUAL',
  'FINAL_REPAYMENT_DEADLINE',
  'SCHEDULE_TABLE',
  'SCHEDULE_TOTAL_PRINCIPAL', 'SCHEDULE_TOTAL_INTEREST', 'SCHEDULE_TOTAL_AMOUNT',
  'LENDER_FULL_NAME', 'LENDER_APP_ACCOUNT_ID',
  'BORROWER_FULL_NAME', 'BORROWER_APP_ACCOUNT_ID',
  'LENDER_SIGNATURE_BLOCK', 'BORROWER_SIGNATURE_BLOCK',
] as const;
