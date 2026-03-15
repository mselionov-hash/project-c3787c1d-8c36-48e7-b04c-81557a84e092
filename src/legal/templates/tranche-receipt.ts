/**
 * Runtime text template: Расписка о получении транша (Tranche Receipt)
 * Source: lovable_readable_legal_source_pack.md
 *
 * Placeholders use {VARIABLE_NAME} syntax.
 * Conditional blocks use [[IF {VAR} == VALUE]] ... [[ENDIF]] syntax.
 *
 * DO NOT simplify or alter the legal wording.
 */

export const TRANCHE_RECEIPT_TEMPLATE_VERSION = '1.0';

export const TRANCHE_RECEIPT_TEMPLATE = `{RECEIPT_TITLE} № {TRANCHE_RECEIPT_NUMBER}
по договору денежного займа № {CONTRACT_NUMBER}

Дата формирования проекта расписки: {TRANCHE_RECEIPT_DRAFT_CREATED_AT}
Дата/время подписания расписки Заемщиком: {TRANCHE_RECEIPT_SIGNED_AT}

1. Сведения о Сторонах

1.1. Займодавец - физическое лицо, являющееся гражданином Российской Федерации: {LENDER_FULL_NAME}, дата рождения: {LENDER_DOB}, паспорт: серия {LENDER_PASSPORT_SERIES} № {LENDER_PASSPORT_NUMBER}, выдан {LENDER_PASSPORT_ISSUED_BY} {LENDER_PASSPORT_ISSUE_DATE}, код подразделения {LENDER_PASSPORT_DIVISION_CODE}, адрес регистрации: {LENDER_REG_ADDRESS}, телефон: {LENDER_CONTACT_PHONE}, email: {LENDER_EMAIL}, ID учетной записи на Платформе: {LENDER_APP_ACCOUNT_ID}.

1.2. Заемщик - физическое лицо, являющееся гражданином Российской Федерации: {BORROWER_FULL_NAME}, дата рождения: {BORROWER_DOB}, паспорт: серия {BORROWER_PASSPORT_SERIES} № {BORROWER_PASSPORT_NUMBER}, выдан {BORROWER_PASSPORT_ISSUED_BY} {BORROWER_PASSPORT_ISSUE_DATE}, код подразделения {BORROWER_PASSPORT_DIVISION_CODE}, адрес регистрации: {BORROWER_REG_ADDRESS}, телефон: {BORROWER_CONTACT_PHONE}, email: {BORROWER_EMAIL}, ID учетной записи на Платформе: {BORROWER_APP_ACCOUNT_ID}.

2. Ссылка на Договор и назначение Расписки

2.1. Настоящая Расписка сформирована в информационной системе {PLATFORM_NAME}, доступной по адресу {PLATFORM_URL}. Оператор Платформы - {PLATFORM_OPERATOR_NAME}. Платформа не является стороной займа, платежным агентом, банковским платежным посредником, поручителем, гарантом или хранителем денежных средств Сторон.

2.2. Настоящая Расписка составлена в рамках Договора денежного займа № {CONTRACT_NUMBER}, дата формирования документа в системе: {CONTRACT_DATE}, дата подписания последней Стороной: {LAST_SIGNATURE_AT} (далее - "Договор").

2.3. Настоящая Расписка относится исключительно к одному конкретному Траншу и не является самостоятельным договором, дополнительным соглашением к Договору или документом, изменяющим условия Договора.

3. Сведения о конкретном Транше

3.1. Идентификатор Транша: {TRANCHE_ID}.

3.2. Сумма Транша: {TRANCHE_AMOUNT} ({TRANCHE_AMOUNT_IN_WORDS}) {TRANCHE_CURRENCY}.

3.3. Дата и время фактического перечисления Транша: {TRANCHE_DATE}, {TRANCHE_TIME} ({TRANCHE_TIMEZONE}).

[[IF {TRANCHE_METHOD} == BANK_TRANSFER]]
3.4. Способ перечисления: безналичный перевод со счета / реквизита Займодавца {TRANCHE_SENDER_ACCOUNT_DISPLAY} на счет / реквизит Заемщика {TRANCHE_RECEIVER_ACCOUNT_DISPLAY}.
[[ENDIF]]

[[IF {TRANCHE_METHOD} == SBP]]
3.4. Способ перечисления: перевод через систему быстрых платежей (СБП) с использованием реквизита / счета Займодавца {TRANCHE_SENDER_ACCOUNT_DISPLAY} на идентификатор / реквизит Заемщика {TRANCHE_RECEIVER_ACCOUNT_DISPLAY}.
[[ENDIF]]

3.5. Назначение платежа: {TRANCHE_REFERENCE_TEXT}.

3.6. Банковский документ / идентификатор платежного подтверждения: {TRANCHE_BANK_DOCUMENT_ID}.

3.7. Дата банковского документа: {TRANCHE_BANK_DOCUMENT_DATE}.

4. Подтверждение получения конкретного Транша

4.1. Настоящим Заемщик подтверждает получение от Займодавца по указанному выше Траншу денежных средств в размере {TRANCHE_AMOUNT} ({TRANCHE_AMOUNT_IN_WORDS}) {TRANCHE_CURRENCY}, перечисленных {TRANCHE_DATE} в {TRANCHE_TIME} ({TRANCHE_TIMEZONE}) на реквизит {TRANCHE_RECEIVER_ACCOUNT_DISPLAY}, в рамках Договора.

4.2. Настоящая Расписка подтверждает исключительно получение указанного в ней Транша и не означает подтверждения получения иных денежных средств по Договору, не изменяет условия Договора, не подменяет банковский документ и не является признанием общего размера задолженности, процентов или иных сумм по Договору сверх сведений о данном Транше.

4.3. Дата и время подписания настоящей Расписки отражают только момент ее подписания Заемщиком и не изменяют дату и время фактического перечисления Транша.

5. Электронная форма документа и подпись

5.1. Настоящая Расписка составлена в электронной форме. Подлинность электронной подписи определяется в соответствии с Правилами электронного взаимодействия / Регламентом ЭДО Платформы.

5.2. Телефон, адрес электронной почты и ID учетной записи на Платформе используются для идентификации учетной записи, направления уведомлений и связывания действий в журнале событий Платформы с владельцем учетной записи.

5.3. Технический порядок формирования, подписания, проверки и хранения электронной подписи определяется Правилами электронного взаимодействия / Регламентом ЭДО Платформы, действующими на дату подписания настоящей Расписки.

5.4. Настоящая Расписка по своей правовой природе исходит от Заемщика. Дополнительная подпись Займодавца, если она предусмотрена Платформой, носит вспомогательный характер и не является обязательной для действительности настоящей Расписки.

Реквизиты и подпись Заемщика

ФИО: {BORROWER_FULL_NAME}
Паспорт: серия {BORROWER_PASSPORT_SERIES} № {BORROWER_PASSPORT_NUMBER}, выдан {BORROWER_PASSPORT_ISSUED_BY} {BORROWER_PASSPORT_ISSUE_DATE}, код подразделения {BORROWER_PASSPORT_DIVISION_CODE}
Адрес регистрации: {BORROWER_REG_ADDRESS}
Телефон: {BORROWER_CONTACT_PHONE}
Email: {BORROWER_EMAIL}
ID учетной записи на Платформе: {BORROWER_APP_ACCOUNT_ID}
Подписано УКЭП: {BORROWER_SIGNATURE_BLOCK}

[[IF {LENDER_CO_SIGNATURE_ENABLED} == YES]]
Дополнительная подпись Займодавца (не обязательна для действительности настоящей Расписки)

ФИО: {LENDER_FULL_NAME}
ID учетной записи на Платформе: {LENDER_APP_ACCOUNT_ID}
Подписано УКЭП: {LENDER_SIGNATURE_BLOCK_OPTIONAL}
[[ENDIF]]

[[IF {PAYMENT_PROOF_ATTACHMENT_ENABLED} == YES]]

Приложение № 1
к Расписке о получении Транша № {TRANCHE_RECEIPT_NUMBER}

Сведения о платежном документе

1. Банковский документ / ID платежного подтверждения: {TRANCHE_BANK_DOCUMENT_ID}.
2. Дата банковского документа: {TRANCHE_BANK_DOCUMENT_DATE}.
3. Источник данных о Транше: {TRANCHE_TRANSFER_SOURCE}.
4. Идентификатор Транша: {TRANCHE_ID}.
[[ENDIF]]
`;

export const TRANCHE_RECEIPT_VARIABLES = [
  'RECEIPT_TITLE', 'TRANCHE_RECEIPT_NUMBER', 'CONTRACT_NUMBER',
  'TRANCHE_RECEIPT_DRAFT_CREATED_AT', 'TRANCHE_RECEIPT_SIGNED_AT',
  'LENDER_FULL_NAME', 'LENDER_DOB', 'LENDER_PASSPORT_SERIES', 'LENDER_PASSPORT_NUMBER',
  'LENDER_PASSPORT_ISSUED_BY', 'LENDER_PASSPORT_ISSUE_DATE', 'LENDER_PASSPORT_DIVISION_CODE',
  'LENDER_REG_ADDRESS', 'LENDER_CONTACT_PHONE', 'LENDER_EMAIL', 'LENDER_APP_ACCOUNT_ID',
  'BORROWER_FULL_NAME', 'BORROWER_DOB', 'BORROWER_PASSPORT_SERIES', 'BORROWER_PASSPORT_NUMBER',
  'BORROWER_PASSPORT_ISSUED_BY', 'BORROWER_PASSPORT_ISSUE_DATE', 'BORROWER_PASSPORT_DIVISION_CODE',
  'BORROWER_REG_ADDRESS', 'BORROWER_CONTACT_PHONE', 'BORROWER_EMAIL', 'BORROWER_APP_ACCOUNT_ID',
  'PLATFORM_NAME', 'PLATFORM_URL', 'PLATFORM_OPERATOR_NAME',
  'CONTRACT_DATE', 'LAST_SIGNATURE_AT',
  'TRANCHE_ID', 'TRANCHE_AMOUNT', 'TRANCHE_AMOUNT_IN_WORDS', 'TRANCHE_CURRENCY',
  'TRANCHE_DATE', 'TRANCHE_TIME', 'TRANCHE_TIMEZONE',
  'TRANCHE_METHOD',
  'TRANCHE_SENDER_ACCOUNT_DISPLAY', 'TRANCHE_RECEIVER_ACCOUNT_DISPLAY',
  'TRANCHE_REFERENCE_TEXT', 'TRANCHE_BANK_DOCUMENT_ID', 'TRANCHE_BANK_DOCUMENT_DATE',
  'TRANCHE_TRANSFER_SOURCE',
  'LENDER_CO_SIGNATURE_ENABLED', 'PAYMENT_PROOF_ATTACHMENT_ENABLED',
  'BORROWER_SIGNATURE_BLOCK', 'LENDER_SIGNATURE_BLOCK_OPTIONAL',
] as const;
