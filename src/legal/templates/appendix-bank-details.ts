/**
 * Runtime text template: Приложение 1 — Допустимые реквизиты и контактный снапшот Сторон
 * Source-aligned with TZ v2.2 legal source pack.
 *
 * Placeholders use {VARIABLE_NAME} syntax.
 * Conditional blocks use [[IF {VAR} == VALUE]] ... [[ENDIF]] syntax.
 *
 * DO NOT simplify or alter the legal wording.
 */

export const APPENDIX_BANK_DETAILS_TEMPLATE_VERSION = '1.0';

export const APPENDIX_BANK_DETAILS_TEMPLATE = `# Приложение № 1
# к Договору денежного займа № {CONTRACT_NUMBER}

## Допустимые банковские реквизиты для выдачи и погашения займа и контактный снапшот Сторон

Дата формирования: {APPENDIX_DATE}

Версия Приложения: {APP1_VERSION}
Вид редакции: {APP1_EDITION_KIND}

[[IF {APP1_EDITION_KIND} == AMENDED]]
Настоящая редакция заменяет предыдущую редакцию Приложения № 1 от {APP1_PREVIOUS_VERSION_DATE}.
Причина изменения: {APP1_AMENDMENT_REASON}
[[ENDIF]]

---

## 1. Сведения о Сторонах

**Займодавец:** {LENDER_FULL_NAME}, паспорт: серия {LENDER_PASSPORT_SERIES} № {LENDER_PASSPORT_NUMBER}, адрес регистрации: {LENDER_REG_ADDRESS}, ID учетной записи на Платформе: {LENDER_APP_ACCOUNT_ID}.

**Заёмщик:** {BORROWER_FULL_NAME}, паспорт: серия {BORROWER_PASSPORT_SERIES} № {BORROWER_PASSPORT_NUMBER}, адрес регистрации: {BORROWER_REG_ADDRESS}, ID учетной записи на Платформе: {BORROWER_APP_ACCOUNT_ID}.

## 2. Политика подтверждения получения

Политика подтверждения получения Транша Заёмщиком: **{BORROWER_DISBURSEMENT_RECEIPT_POLICY_LABEL}**
Политика подтверждения получения возврата Займодавцем: **{LENDER_REPAYMENT_RECEIPT_POLICY_LABEL}**

## 3. Допустимые реквизиты Займодавца для выдачи (перечисления) Транша

{LENDER_DISBURSEMENT_ACCOUNTS}

## 4. Допустимые реквизиты Заёмщика для получения Транша

{BORROWER_DISBURSEMENT_ACCOUNTS}

## 5. Допустимые реквизиты Займодавца для получения возврата займа

{LENDER_REPAYMENT_ACCOUNTS}

## 6. Допустимые реквизиты Заёмщика для осуществления возврата займа

{BORROWER_REPAYMENT_ACCOUNTS}

## 7. Контактный снапшот Сторон для уведомлений

{NOTICE_SNAPSHOT_TABLE}

## 8. Общие положения

8.1. Перечисление денежных средств на реквизиты, не включённые в настоящее Приложение и не согласованные дополнительным соглашением, не считается надлежащим исполнением обязательства до тех пор, пока получатель не подтвердит получение такого платежа либо Стороны не подпишут изменение к Договору.

8.2. Изменение Допустимых реквизитов после подписания Договора допускается только путём оформления дополнительного соглашения, подписанного обеими Сторонами, или замены настоящего Приложения новой редакцией, подписанной обеими Сторонами.

8.3. Настоящее Приложение является неотъемлемой частью Договора денежного займа № {CONTRACT_NUMBER}.

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

export const APPENDIX_BANK_DETAILS_VARIABLES = [
  'CONTRACT_NUMBER',
  'APPENDIX_DATE',
  'APP1_VERSION',
  'APP1_EDITION_KIND',
  'APP1_PREVIOUS_VERSION_DATE',
  'APP1_AMENDMENT_REASON',
  'LENDER_FULL_NAME', 'LENDER_PASSPORT_SERIES', 'LENDER_PASSPORT_NUMBER',
  'LENDER_REG_ADDRESS', 'LENDER_APP_ACCOUNT_ID',
  'BORROWER_FULL_NAME', 'BORROWER_PASSPORT_SERIES', 'BORROWER_PASSPORT_NUMBER',
  'BORROWER_REG_ADDRESS', 'BORROWER_APP_ACCOUNT_ID',
  'BORROWER_DISBURSEMENT_RECEIPT_POLICY_LABEL',
  'LENDER_REPAYMENT_RECEIPT_POLICY_LABEL',
  'LENDER_DISBURSEMENT_ACCOUNTS',
  'BORROWER_DISBURSEMENT_ACCOUNTS',
  'LENDER_REPAYMENT_ACCOUNTS',
  'BORROWER_REPAYMENT_ACCOUNTS',
  'NOTICE_SNAPSHOT_TABLE',
  'LENDER_SIGNATURE_BLOCK',
  'BORROWER_SIGNATURE_BLOCK',
] as const;
