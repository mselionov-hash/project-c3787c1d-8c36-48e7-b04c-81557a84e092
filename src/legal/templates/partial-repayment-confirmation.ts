/**
 * Runtime text template: Приложение № 4 — Подтверждение частичного исполнения
 * Source-aligned with authoritative DOCX: Shablon_APP4_podtverzhdenie_chastichnogo_ispolneniya_v1_0.docx
 *
 * Placeholders use {VARIABLE_NAME} syntax.
 * Single-line prefix conditionals use [При {VAR}=VALUE] syntax.
 *
 * DO NOT simplify or alter the legal wording.
 */

export const PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION = '2.0';

export const PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE = `| **Номер договора** | **{CONTRACT_NUMBER}** |
|---|---|
| **Дата договора** | **{CONTRACT_DATE}** |
| **Номер подтверждения APP4** | **{APP4_SERIAL_NO}** |
| **Дата документа** | **{APP4_DOCUMENT_DATE}** |
| **Схема подписи** | **{SIGNATURE_SCHEME_LABEL}** |
| **ID подтвержденного возврата** | **{REPAYMENT_ID}** |
| **Дата / время платежа** | **{REPAYMENT_DATE} / {REPAYMENT_TIME}** |
| **Сумма платежа** | **{REPAYMENT_AMOUNT} ({REPAYMENT_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}** |
| **Способ возврата** | **{REPAYMENT_METHOD_LABEL}** |
| **Платежный документ** | **{REPAYMENT_BANK_DOCUMENT_ID}** |
| **Версия APP1** | **{APP1_EFFECTIVE_DOCUMENT_ID}** |

# Приложение № 4 к договору займа № {CONTRACT_NUMBER} от {CONTRACT_DATE}

# Подтверждение частичного исполнения № {APP4_SERIAL_NO} от {APP4_DOCUMENT_DATE}

## 1. Подтверждение частичного исполнения

1.1. Я, {LENDER_FULL_NAME}, являющийся Займодавцем по Договору займа № {CONTRACT_NUMBER} от {CONTRACT_DATE}, настоящим подтверждаю частичное исполнение Заемщиком {BORROWER_FULL_NAME} обязательства по указанному Договору в части конкретного подтвержденного платежа {REPAYMENT_ID} на сумму {REPAYMENT_AMOUNT} ({REPAYMENT_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}, произведенного {REPAYMENT_DATE} в {REPAYMENT_TIME}.

1.2. Настоящее Приложение подтверждает только частичное исполнение в пределах указанного выше подтвержденного платежа и не может толковаться как подтверждение полного прекращения обязательства по Договору займа.

1.3. Настоящее Приложение не заменяет банковские документы и иные допустимые доказательства исполнения, а используется совместно с ними как отдельное одностороннее подтверждение Займодавца.

## 2. Сведения о способе возврата и реквизитах получения платежа

2.1. Для целей настоящего Приложения реквизиты получения возврата определяются исключительно релевантной подписанной версией Приложения № 1 к Договору ({APP1_EFFECTIVE_DOCUMENT_ID}), действовавшей на дату и время соответствующего платежа.

2.2.

[При {REPAYMENT_METHOD}=BANK_TRANSFER] Возврат осуществлен банковским переводом на допустимый банковский счет Займодавца, согласованный в релевантной версии Приложения № 1: {REPAYMENT_RECEIVER_BANK_ACCOUNT_DISPLAY}; банк: {REPAYMENT_RECEIVER_BANK_NAME}; иные сведения для индивидуализации реквизита: {REPAYMENT_RECEIVER_BANK_REQUISITE_DETAILS}.

[При {REPAYMENT_METHOD}=SBP] Возврат осуществлен через систему быстрых платежей (СБП) по маршруту, согласованному в релевантной версии Приложения № 1: телефон/идентификатор {REPAYMENT_RECEIVER_SBP_ID}; банк {REPAYMENT_RECEIVER_SBP_BANK}; инструкция для отправителя {REPAYMENT_RECEIVER_SBP_INSTRUCTION}. Телефоны Сторон, указанные в основном тексте Договора, не являются реквизитами для СБП и используются только для идентификации Сторон и направления юридически значимых уведомлений.

2.3. Индивидуализация подтвержденного платежа осуществляется по платежному документу / иному доказательству {REPAYMENT_BANK_DOCUMENT_ID} и по назначению платежа / reference text: {REPAYMENT_REFERENCE_TEXT}.

## 3. Распределение подтвержденного платежа

Распределение отражается в очередности, совместимой с Договором и ст. 319 ГК РФ.

| **Компонент обязательства** | **Сумма** |
|---|---|
| Издержки кредитора | {APP4_ALLOCATION_TO_COSTS} |
| Проценты по займу | {APP4_ALLOCATION_TO_INTEREST} |
| Основной долг | {APP4_ALLOCATION_TO_PRINCIPAL} |
| Суммы по ст. 395 ГК РФ | {APP4_ALLOCATION_TO_395} |
| **Итого подтвержденный платеж** | **{REPAYMENT_AMOUNT}** |

## 4. Остаток обязательства после подтвержденного частичного исполнения

| **Показатель** | **Значение** |
|---|---|
| Остаток основного долга | {APP4_REMAINING_PRINCIPAL_AFTER} |
| Общая сумма оставшегося обязательства | {APP4_TOTAL_REMAINING_OBLIGATION_AFTER} |

## 5. Связь с Приложением № 2 — графиком платежей

[При {APP2_APPLIES}=true] 5.1. По данному Договору применяется Приложение № 2 — график платежей. По результатам обработки подтвержденного возврата связанная редакция APP2 определяется как {APP2_LINKED_DOCUMENT_ID}; результат связанного APP2-flow: {APP2_RECALC_ACTION_LABEL}. Настоящее Приложение № 4 не является самостоятельным изменением условий Договора; связка с APP2 отражает производный перерасчет по фактической истории денежных событий.

[При {APP2_APPLIES}=false] 5.1. По данному Договору Приложение № 2 — график платежей — не применяется; настоящее Приложение № 4 фиксирует подтвержденный возврат и остаток обязательства без ссылки на APP2.

[При {APP4_REQUEST_ID_EXISTS}=true] 5.2. Настоящее Приложение выпущено в ответ на запрос Заемщика: {APP4_REQUEST_ID}.

## 6. Пределы действия настоящего Приложения

6.1. Настоящее Приложение № 4 подтверждает только конкретный подтвержденный платеж {REPAYMENT_ID} и не подтверждает полное исполнение обязательства по Договору займа.

6.2. Если после соответствующего платежа обязательство было бы исполнено полностью, для такой ситуации используется Приложение № 5, а не настоящее Приложение № 4.

6.3. Настоящее Приложение не изменяет сумму займа, срок, проценты, график платежей, платежные реквизиты, схему подписи и иные материальные условия Договора и не используется для их пересогласования.

## 7. Подписание

7.1.

[При {SIGNATURE_SCHEME_EFFECTIVE}=UKEP_ONLY] Настоящее Приложение подписывается только Займодавцем усиленной квалифицированной электронной подписью (УКЭП) в соответствии с условиями Договора и законодательством Российской Федерации.

[При {SIGNATURE_SCHEME_EFFECTIVE}=UNEP_WITH_APPENDIX_6] Настоящее Приложение подписывается только Займодавцем усиленной неквалифицированной электронной подписью (УНЭП) в соответствии с условиями Договора, Приложением № 6 к Договору ({APPENDIX_6_REFERENCE}) и Регламентом электронного взаимодействия платформы.

---

ЗАЙМОДАВЕЦ
{LENDER_FULL_NAME}
Подписано электронной подписью в платформе в соответствии со схемой {SIGNATURE_SCHEME_LABEL}.
Дата/время подписи: {APP4_SIGNED_AT}
`;

export const PARTIAL_REPAYMENT_CONFIRMATION_VARIABLES = [
  // Header metadata
  'CONTRACT_NUMBER', 'CONTRACT_DATE',
  'APP4_SERIAL_NO', 'APP4_DOCUMENT_DATE',
  'SIGNATURE_SCHEME_LABEL', 'SIGNATURE_SCHEME_EFFECTIVE',
  'REPAYMENT_ID',
  'REPAYMENT_DATE', 'REPAYMENT_TIME',
  'REPAYMENT_AMOUNT', 'REPAYMENT_AMOUNT_IN_WORDS', 'LOAN_CURRENCY',
  'REPAYMENT_METHOD', 'REPAYMENT_METHOD_LABEL',
  'REPAYMENT_BANK_DOCUMENT_ID',
  'APP1_EFFECTIVE_DOCUMENT_ID',
  // Parties
  'LENDER_FULL_NAME', 'BORROWER_FULL_NAME',
  // Method-specific payment details (bank)
  'REPAYMENT_RECEIVER_BANK_ACCOUNT_DISPLAY',
  'REPAYMENT_RECEIVER_BANK_NAME',
  'REPAYMENT_RECEIVER_BANK_REQUISITE_DETAILS',
  // Method-specific payment details (SBP)
  'REPAYMENT_RECEIVER_SBP_ID',
  'REPAYMENT_RECEIVER_SBP_BANK',
  'REPAYMENT_RECEIVER_SBP_INSTRUCTION',
  // Reference text
  'REPAYMENT_REFERENCE_TEXT',
  // Allocation table
  'APP4_ALLOCATION_TO_COSTS',
  'APP4_ALLOCATION_TO_INTEREST',
  'APP4_ALLOCATION_TO_PRINCIPAL',
  'APP4_ALLOCATION_TO_395',
  // Remaining obligation
  'APP4_REMAINING_PRINCIPAL_AFTER',
  'APP4_TOTAL_REMAINING_OBLIGATION_AFTER',
  // APP2 linkage
  'APP2_APPLIES',
  'APP2_LINKED_DOCUMENT_ID',
  'APP2_RECALC_ACTION_LABEL',
  // Request ID conditional
  'APP4_REQUEST_ID_EXISTS', 'APP4_REQUEST_ID',
  // Signature
  'APPENDIX_6_REFERENCE',
  'APP4_SIGNED_AT',
] as const;
