/**
 * Runtime text template: Приложение № 2 — График платежей
 * Source-aligned with authoritative DOCX: Shablon_APP2_grafik_platezhey_v1_1_rus_clean.docx
 *
 * Placeholders use {VARIABLE_NAME} syntax.
 * Single-line prefix conditionals use [При {VAR}=VALUE] syntax.
 * Row repeaters use [[REPEAT:SECTION]] syntax.
 * Assembly-time condition notes are not rendered.
 *
 * DO NOT simplify or alter the legal wording.
 */

export const APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE_VERSION = '2.0';

export const APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE = `# Приложение № 2 к договору займа № {CONTRACT_NUMBER} от {CONTRACT_DATE}

# График платежей — редакция № {APP2_VERSION_NO} от {APP2_DOCUMENT_DATE}

| **Номер договора** | {CONTRACT_NUMBER} |
|---|---|
| **Дата договора** | {CONTRACT_DATE} |
| **Номер редакции Приложения 2** | {APP2_VERSION_NO} |
| **Дата документа** | {APP2_DOCUMENT_DATE} |
| **Вид редакции** | {APP2_EDITION_KIND_LABEL} |
| **Источник формирования** | {APP2_GENERATION_SOURCE_LABEL} |
| **Схема подписи** | {SIGNATURE_SCHEME_LABEL} |
| **Режим графика** | {REPAYMENT_SCHEDULE_TYPE_LABEL} |
| **Расчетная дата/время** | {APP2_CALCULATED_AT} |
| **Результат актуализации** | {APP2_RECALC_RESULT_LABEL} |
| **Текущий статус редакции APP2** | {APP2_CURRENT_STATUS_LABEL} |
| **Уровень предупреждения** | {APP2_WARNING_LEVEL_LABEL} |
| **Базовое договорное основание графика** | {APP2_BASE_CONTRACT_VIEW_REF} |
| **Контрольный идентификатор набора исходных данных** | {APP2_SOURCE_SET_HASH} |
| **Связанное основание актуализации** | {APP2_TRIGGER_REFERENCE} |
| **Ссылки на Приложение 1 и иные контекстные документы** | {APP2_CONTEXT_APP1_REFS} |

Важно. Настоящее Приложение отображает согласованный либо актуализированный расчетный график исполнения денежного обязательства по Договору займа и само по себе не подтверждает факт выдачи или возврата денежных средств. Доказательственная база конкретных траншей и возвратов определяется соответствующими банковскими документами и, когда применимо, связанными Приложениями № 3, № 4 и № 5.

Расчетная дата предполагаемого полного погашения носит справочный характер и не изменяет договорную дату окончательного возврата. Если для актуализации графика требуется изменить лимит займа, процентную ставку, дату окончательного возврата, тип графика либо иную материальную договорную базу, соответствующее изменение оформляется только через Приложение № 7.

## 1. Краткая сводка по текущей редакции графика

| **Сумма подтвержденных выдач по Договору** | {CONFIRMED_TRANCHE_TOTAL} |
|---|---|
| **Сумма подтвержденных возвратов по Договору** | {CONFIRMED_REPAYMENT_TOTAL} |
| Непогашенный основной долг | {OUTSTANDING_PRINCIPAL} |
| Непогашенные проценты по займу | {OUTSTANDING_LOAN_INTEREST} |
| Непогашенные суммы по ст. 395 ГК РФ | {OUTSTANDING_395_INTEREST} |
| Непогашенные издержки кредитора | {OUTSTANDING_CREDITOR_COSTS} |
| Договорная дата окончательного возврата | {CONTRACTUAL_FINAL_DEADLINE} |
| Расчетная дата предполагаемого полного погашения | {PROJECTED_PAYOFF_DATE} |
| Краткая сводка по ближайшему платежу | {NEXT_DUE_ROW_SUMMARY} |

## 2. Пределы действия настоящего Приложения

2.1. Настоящее Приложение № 2 применяется только в тех случаях, когда по Договору предусмотрен график платежей и он является обязательной частью документного пакета.

2.2. Настоящее Приложение не печатает и не изменяет платежные реквизиты Сторон; единственным источником таких реквизитов и параметров получения переводов остается релевантная подписанная версия Приложения № 1.

2.3. Настоящее Приложение не может использоваться как скрытый канал изменения материальных условий Договора и не легализует спорные или неподтвержденные денежные события задним числом.

## 3. Основная таблица графика платежей

[[REPEAT:APP2_SCHEDULE_ROWS]]
| **№** | **Вид строки** | **Дата / период** | **Основание / ID события** | **Издержки** | **Проценты по займу** | **Основной долг** | **Ст. 395 ГК РФ** | **Итого строки** | **Остаток основного долга** | **Комментарий / статус** |
|---|---|---|---|---|---|---|---|---|---|---|
| {APP2_ROW_NO} | {APP2_ROW_KIND_LABEL} | {APP2_ROW_DATE_OR_PERIOD} | {APP2_ROW_EVENT_REF} | {APP2_ROW_TO_COSTS} | {APP2_ROW_TO_LOAN_INTEREST} | {APP2_ROW_TO_PRINCIPAL} | {APP2_ROW_TO_395} | {APP2_ROW_TOTAL} | {APP2_ROW_OUTSTANDING_PRINCIPAL_AFTER} | {APP2_ROW_NOTE} |
[[END_REPEAT]]

## 4. Служебные пояснения к виду редакции

[При {APP2_EDITION_KIND}=INITIAL_SIGNED] 4.1. Настоящая редакция является первоначальной согласованной редакцией графика платежей и входит в обязательный первоначальный пакет документов по Договору займа.

[При {APP2_EDITION_KIND}=AMENDMENT_SIGNED] 4.2. Настоящая редакция является согласованной двусторонней редакцией графика платежей после изменения договорной базы по подписанной цепочке Приложения № 7.

[При {APP2_EDITION_KIND}=CURRENT_DERIVED] 4.3. Настоящая текущая расчетная редакция сформирована системой на основании уже подписанной договорной базы и подтвержденных денежных событий. Она не является самостоятельным двусторонним документом об изменении условий и не изменяет условия Договора.

[При {APP2_EDITION_KIND}=CLOSEOUT_DERIVED] 4.4. Настоящая итоговая расчетная редакция сформирована системой после полного учета подтвержденных денежных событий и отражает исчерпание графика при нулевом остатке обязательства. Такая редакция не заменяет Приложение № 5 и не подменяет банковские доказательства исполнения.

## 5. Подпись либо публикация текущей редакции

[При {APP2_EDITION_KIND}=INITIAL_SIGNED] 5.1. Для подписанных редакций графика печатается двусторонний блок подписания Сторон. Документ подписывается в схеме подписи, действующей по Договору займа.

[При {APP2_EDITION_KIND}=AMENDMENT_SIGNED] 5.1. Для подписанных редакций графика печатается двусторонний блок подписания Сторон. Документ подписывается в схеме подписи, действующей по Договору займа.

| **ЗАЙМОДАВЕЦ** | **ЗАЕМЩИК** |
|---|---|
| {LENDER_FULL_NAME} | {BORROWER_FULL_NAME} |
| Подписано электронной подписью в платформе в соответствии со схемой {SIGNATURE_SCHEME_LABEL}. | Подписано электронной подписью в платформе в соответствии со схемой {SIGNATURE_SCHEME_LABEL}. |
| Дата/время подписи: {APP2_LENDER_SIGNED_AT} | Дата/время подписи: {APP2_BORROWER_SIGNED_AT} |

[При {APP2_EDITION_KIND}=CURRENT_DERIVED] 5.2. Настоящая редакция сформирована системой на основании уже подписанной договорной базы и подтвержденных денежных событий; повторное двустороннее подписание для данной редакции не требуется.

[При {APP2_EDITION_KIND}=CLOSEOUT_DERIVED] 5.2. Настоящая редакция сформирована системой на основании уже подписанной договорной базы и подтвержденных денежных событий; повторное двустороннее подписание для данной редакции не требуется.
`;

export const APPENDIX_REPAYMENT_SCHEDULE_VARIABLES = [
  // Header metadata
  'CONTRACT_NUMBER', 'CONTRACT_DATE',
  'APP2_VERSION_NO', 'APP2_DOCUMENT_DATE',
  'APP2_EDITION_KIND', 'APP2_EDITION_KIND_LABEL',
  'APP2_GENERATION_SOURCE_LABEL',
  'SIGNATURE_SCHEME_LABEL',
  'REPAYMENT_SCHEDULE_TYPE_LABEL',
  'APP2_CALCULATED_AT',
  'APP2_RECALC_RESULT_LABEL',
  'APP2_CURRENT_STATUS_LABEL',
  'APP2_WARNING_LEVEL_LABEL',
  'APP2_BASE_CONTRACT_VIEW_REF',
  'APP2_SOURCE_SET_HASH',
  'APP2_TRIGGER_REFERENCE',
  'APP2_CONTEXT_APP1_REFS',
  // Summary section 1
  'CONFIRMED_TRANCHE_TOTAL', 'CONFIRMED_REPAYMENT_TOTAL',
  'OUTSTANDING_PRINCIPAL', 'OUTSTANDING_LOAN_INTEREST',
  'OUTSTANDING_395_INTEREST', 'OUTSTANDING_CREDITOR_COSTS',
  'CONTRACTUAL_FINAL_DEADLINE', 'PROJECTED_PAYOFF_DATE',
  'NEXT_DUE_ROW_SUMMARY',
  // Row-level repeater fields
  'APP2_ROW_NO', 'APP2_ROW_KIND_LABEL', 'APP2_ROW_DATE_OR_PERIOD',
  'APP2_ROW_EVENT_REF', 'APP2_ROW_TO_COSTS', 'APP2_ROW_TO_LOAN_INTEREST',
  'APP2_ROW_TO_PRINCIPAL', 'APP2_ROW_TO_395', 'APP2_ROW_TOTAL',
  'APP2_ROW_OUTSTANDING_PRINCIPAL_AFTER', 'APP2_ROW_NOTE',
  // Signature
  'LENDER_FULL_NAME', 'BORROWER_FULL_NAME',
  'APP2_LENDER_SIGNED_AT', 'APP2_BORROWER_SIGNED_AT',
] as const;
