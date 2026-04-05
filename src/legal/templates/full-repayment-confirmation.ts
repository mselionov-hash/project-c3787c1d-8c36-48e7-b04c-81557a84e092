/**
 * Runtime text template: Приложение № 5 — Подтверждение полного исполнения
 * Source-aligned with authoritative DOCX: Shablon_APP5_podtverzhdenie_polnogo_ispolneniya_v1_0.docx
 *
 * Placeholders use {VARIABLE_NAME} syntax.
 * Single-line prefix conditionals use [При {VAR}=VALUE] syntax.
 *
 * DO NOT simplify or alter the legal wording.
 */

export const FULL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION = '2.0';

export const FULL_REPAYMENT_CONFIRMATION_TEMPLATE = `| **Номер договора** | **{CONTRACT_NUMBER}** |
|---|---|
| **Дата договора** | **{CONTRACT_DATE}** |
| **Номер подтверждения APP5** | **{APP5_SERIAL_NO}** |
| **Дата документа** | **{APP5_DOCUMENT_DATE}** |
| **Схема подписи** | **{SIGNATURE_SCHEME_LABEL}** |
| **ID closing REPAYMENT** | **{CLOSING_REPAYMENT_ID}** |
| **Дата / время closing-платежа** | **{CLOSING_REPAYMENT_DATE} / {CLOSING_REPAYMENT_TIME}** |
| **Сумма closing-платежа** | **{CLOSING_REPAYMENT_AMOUNT} ({CLOSING_REPAYMENT_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}** |
| **Способ возврата** | **{CLOSING_REPAYMENT_METHOD_LABEL}** |
| **Платежный документ** | **{CLOSING_REPAYMENT_BANK_DOCUMENT_ID}** |
| **Версия APP1** | **{APP1_EFFECTIVE_DOCUMENT_ID}** |
| **Дата/время статуса CLOSED** | **{DEAL_CLOSED_AT}** |

# Приложение № 5 к договору займа № {CONTRACT_NUMBER} от {CONTRACT_DATE}

# Подтверждение полного исполнения № {APP5_SERIAL_NO} от {APP5_DOCUMENT_DATE}

## 1. Подтверждение полного исполнения

1.1. Я, {LENDER_FULL_NAME}, являющийся Займодавцем по Договору займа № {CONTRACT_NUMBER} от {CONTRACT_DATE}, настоящим подтверждаю полное исполнение Заемщиком {BORROWER_FULL_NAME} денежных обязательств по указанному Договору. Полное исполнение подтверждается по состоянию после учета всей подтвержденной истории денежных событий по Договору, включая closing REPAYMENT {CLOSING_REPAYMENT_ID} на сумму {CLOSING_REPAYMENT_AMOUNT} ({CLOSING_REPAYMENT_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}, произведенный {CLOSING_REPAYMENT_DATE} в {CLOSING_REPAYMENT_TIME}.

1.2. По результатам распределения closing-платежа и учета всех подтвержденных выдач и возвратов по Договору общий остаток обязательства Заемщика по указанному Договору равен нулю.

1.3. Настоящее Приложение не заменяет банковские документы и иные допустимые доказательства исполнения, а используется совместно с ними как отдельное одностороннее подтверждение Займодавца.

## 2. Сведения о способе возврата и реквизитах получения платежа

2.1. Для целей настоящего Приложения реквизиты получения closing-платежа определяются исключительно релевантной подписанной версией Приложения № 1 к Договору ({APP1_EFFECTIVE_DOCUMENT_ID}), действовавшей на дату и время соответствующего платежа.

2.2.

[При {CLOSING_REPAYMENT_METHOD}=BANK_TRANSFER] Closing-платеж осуществлен банковским переводом на допустимый банковский счет Займодавца, согласованный в релевантной версии Приложения № 1: {CLOSING_REPAYMENT_RECEIVER_BANK_ACCOUNT_DISPLAY}; банк: {CLOSING_REPAYMENT_RECEIVER_BANK_NAME}; иные сведения для индивидуализации реквизита: {CLOSING_REPAYMENT_RECEIVER_BANK_REQUISITE_DETAILS}.

[При {CLOSING_REPAYMENT_METHOD}=SBP] Closing-платеж осуществлен через систему быстрых платежей (СБП) по маршруту, согласованному в релевантной версии Приложения № 1: телефон/идентификатор {CLOSING_REPAYMENT_RECEIVER_SBP_ID}; банк {CLOSING_REPAYMENT_RECEIVER_SBP_BANK}; инструкция для отправителя {CLOSING_REPAYMENT_RECEIVER_SBP_INSTRUCTION}. Телефоны Сторон, указанные в основном тексте Договора, не являются реквизитами для СБП и используются только для идентификации Сторон и направления юридически значимых уведомлений.

2.3. Индивидуализация closing-платежа осуществляется по платежному документу / иному доказательству {CLOSING_REPAYMENT_BANK_DOCUMENT_ID} и по назначению платежа / reference text: {CLOSING_REPAYMENT_REFERENCE_TEXT}.

## 3. Распределение closing-платежа

Распределение отражается в очередности, совместимой с Договором и ст. 319 ГК РФ.

| **Компонент обязательства** | **Сумма** |
|---|---|
| Издержки кредитора | {APP5_ALLOCATION_TO_COSTS} |
| Проценты по займу | {APP5_ALLOCATION_TO_INTEREST} |
| Основной долг | {APP5_ALLOCATION_TO_PRINCIPAL} |
| Суммы по ст. 395 ГК РФ | {APP5_ALLOCATION_TO_395} |
| **Итого closing-платеж** | **{CLOSING_REPAYMENT_AMOUNT}** |

## 4. Итог полного исполнения по Договору

Настоящий full-performance summary отражает агрегированную структуру исполнения по Договору в целом и не является самостоятельным изменением условий Договора.

| **Показатель** | **Значение** |
|---|---|
| Итоговая сумма подтвержденных выдач по Договору | {APP5_TOTAL_DISBURSED} |
| Итоговая сумма подтвержденных возвратов по Договору | {APP5_TOTAL_REPAID_CONFIRMED} |
| Кумулятивно погашенные издержки | {APP5_TOTAL_ALLOCATED_TO_COSTS} |
| Кумулятивно погашенные проценты по займу | {APP5_TOTAL_ALLOCATED_TO_INTEREST} |
| Кумулятивно погашенный основной долг | {APP5_TOTAL_ALLOCATED_TO_PRINCIPAL} |
| Кумулятивно погашенные суммы по ст. 395 ГК РФ | {APP5_TOTAL_ALLOCATED_TO_395} |

## 5. Нулевой остаток обязательства и статус CLOSED

| **Показатель** | **Значение** |
|---|---|
| Остаток основного долга после closing-event | {APP5_REMAINING_PRINCIPAL_AFTER} |
| Общая сумма оставшегося обязательства после closing-event | {APP5_TOTAL_REMAINING_OBLIGATION_AFTER} |
| Дата/время фиксации статуса CLOSED | {DEAL_CLOSED_AT} |

## 6. Связь с Приложением № 2 — графиком платежей

[При {APP2_APPLIES}=true] 6.1. По данному Договору применяется Приложение № 2 — график платежей. По результатам полного исполнения связанная финальная редакция APP2 определяется как {APP2_LINKED_DOCUMENT_ID}; результат финального APP2 closeout-flow: {APP2_CLOSEOUT_STATUS}. Настоящее Приложение № 5 не является самостоятельным изменением условий Договора; связка с APP2 отражает производный финальный перерасчет по фактической истории денежных событий.

[При {APP2_APPLIES}=false] 6.1. По данному Договору Приложение № 2 — график платежей — не применяется; настоящее Приложение № 5 фиксирует полное исполнение и нулевой остаток обязательства без ссылки на APP2.

[При {APP5_REQUEST_ID_EXISTS}=true] 6.2. Настоящее Приложение выпущено в ответ на запрос Заемщика: {APP5_REQUEST_ID}.

[При {APP5_SUPERSEDES_ID_EXISTS}=true] 6.3. Настоящее Приложение выпущено как corrective reissue / замещающий экземпляр по отношению к предыдущему APP5: {APP5_SUPERSEDES_ID}.

## 7. Пределы действия настоящего Приложения

7.1. Настоящее Приложение № 5 подтверждает полное исполнение обязательства по Договору займа № {CONTRACT_NUMBER} от {CONTRACT_DATE} в целом и не может толковаться как самостоятельное основание прекращения обязательства вне факта надлежащего денежного исполнения.

7.2. Настоящее Приложение не является актом сверки, не изменяет сумму займа, срок, проценты, график платежей, платежные реквизиты, схему подписи и иные материальные условия Договора и не используется для прощения долга, новации или иных правоизменяющих сценариев.

7.3. Настоящее Приложение сохраняет силу постольку, поскольку closing REPAYMENT и underlying zero-balance snapshot остаются подтвержденными; при последующем переводе таких оснований в спор, пересмотр или отмену соответствующий APP5 может быть переведен в INVALID / SUPERSEDED-flow с переоценкой статуса Договора.

## 8. Подписание

8.1.

[При {SIGNATURE_SCHEME_EFFECTIVE}=UKEP_ONLY] Настоящее Приложение подписывается только Займодавцем усиленной квалифицированной электронной подписью (УКЭП) в соответствии с условиями Договора и законодательством Российской Федерации.

[При {SIGNATURE_SCHEME_EFFECTIVE}=UNEP_WITH_APPENDIX_6] Настоящее Приложение подписывается только Займодавцем усиленной неквалифицированной электронной подписью (УНЭП) в соответствии с условиями Договора, Приложением № 6 к Договору ({APPENDIX_6_REFERENCE}) и Регламентом электронного взаимодействия платформы.

---

ЗАЙМОДАВЕЦ
{LENDER_FULL_NAME}
Подписано электронной подписью в платформе в соответствии со схемой {SIGNATURE_SCHEME_LABEL}.
Дата/время подписи: {APP5_SIGNED_AT}
`;

export const FULL_REPAYMENT_CONFIRMATION_VARIABLES = [
  // Header metadata
  'CONTRACT_NUMBER', 'CONTRACT_DATE',
  'APP5_SERIAL_NO', 'APP5_DOCUMENT_DATE',
  'SIGNATURE_SCHEME_LABEL', 'SIGNATURE_SCHEME_EFFECTIVE',
  'CLOSING_REPAYMENT_ID',
  'CLOSING_REPAYMENT_DATE', 'CLOSING_REPAYMENT_TIME',
  'CLOSING_REPAYMENT_AMOUNT', 'CLOSING_REPAYMENT_AMOUNT_IN_WORDS', 'LOAN_CURRENCY',
  'CLOSING_REPAYMENT_METHOD', 'CLOSING_REPAYMENT_METHOD_LABEL',
  'CLOSING_REPAYMENT_BANK_DOCUMENT_ID',
  'APP1_EFFECTIVE_DOCUMENT_ID',
  'DEAL_CLOSED_AT',
  // Parties
  'LENDER_FULL_NAME', 'BORROWER_FULL_NAME',
  // Method-specific payment details (bank)
  'CLOSING_REPAYMENT_RECEIVER_BANK_ACCOUNT_DISPLAY',
  'CLOSING_REPAYMENT_RECEIVER_BANK_NAME',
  'CLOSING_REPAYMENT_RECEIVER_BANK_REQUISITE_DETAILS',
  // Method-specific payment details (SBP)
  'CLOSING_REPAYMENT_RECEIVER_SBP_ID',
  'CLOSING_REPAYMENT_RECEIVER_SBP_BANK',
  'CLOSING_REPAYMENT_RECEIVER_SBP_INSTRUCTION',
  // Reference text
  'CLOSING_REPAYMENT_REFERENCE_TEXT',
  // Allocation table
  'APP5_ALLOCATION_TO_COSTS',
  'APP5_ALLOCATION_TO_INTEREST',
  'APP5_ALLOCATION_TO_PRINCIPAL',
  'APP5_ALLOCATION_TO_395',
  // Full performance summary
  'APP5_TOTAL_DISBURSED',
  'APP5_TOTAL_REPAID_CONFIRMED',
  'APP5_TOTAL_ALLOCATED_TO_COSTS',
  'APP5_TOTAL_ALLOCATED_TO_INTEREST',
  'APP5_TOTAL_ALLOCATED_TO_PRINCIPAL',
  'APP5_TOTAL_ALLOCATED_TO_395',
  // Zero balance / CLOSED
  'APP5_REMAINING_PRINCIPAL_AFTER',
  'APP5_TOTAL_REMAINING_OBLIGATION_AFTER',
  // APP2 linkage
  'APP2_APPLIES',
  'APP2_LINKED_DOCUMENT_ID',
  'APP2_CLOSEOUT_STATUS',
  // Request / supersedes conditionals
  'APP5_REQUEST_ID_EXISTS', 'APP5_REQUEST_ID',
  'APP5_SUPERSEDES_ID_EXISTS', 'APP5_SUPERSEDES_ID',
  // Signature
  'APPENDIX_6_REFERENCE',
  'APP5_SIGNED_AT',
] as const;
