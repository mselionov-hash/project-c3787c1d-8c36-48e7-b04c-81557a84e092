/**
 * Runtime text template: Приложение 2 — График погашения
 * Generated only when repayment_schedule_type is INSTALLMENTS_FIXED or INSTALLMENTS_VARIABLE.
 */

export const APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE_VERSION = '1.0';

export const APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE = `Приложение № 2
к Договору денежного займа № {CONTRACT_NUMBER}

График погашения займа

Дата формирования: {APPENDIX_DATE}

Тип графика: {SCHEDULE_TYPE_LABEL}

Предельная сумма займа: {LOAN_AMOUNT} ({LOAN_AMOUNT_IN_WORDS}) {LOAN_CURRENCY}

[[IF {INTEREST_MODE} == FIXED_RATE]]
Процентная ставка: {INTEREST_RATE_ANNUAL}% годовых
[[ENDIF]]

Срок окончательного возврата: {FINAL_REPAYMENT_DEADLINE}

{SCHEDULE_TABLE}

Примечания:
- Суммы указаны исходя из Предельной суммы займа. Если фактически предоставленная сумма займа окажется меньше, обязательства Заёмщика определяются исходя из фактически предоставленной и непогашенной суммы.
- При частичном досрочном погашении оставшиеся платежи подлежат пересчёту.

Настоящее Приложение является неотъемлемой частью Договора денежного займа № {CONTRACT_NUMBER}.
`;

export const APPENDIX_REPAYMENT_SCHEDULE_VARIABLES = [
  'CONTRACT_NUMBER',
  'APPENDIX_DATE',
  'SCHEDULE_TYPE_LABEL',
  'LOAN_AMOUNT',
  'LOAN_AMOUNT_IN_WORDS',
  'LOAN_CURRENCY',
  'INTEREST_MODE',
  'INTEREST_RATE_ANNUAL',
  'FINAL_REPAYMENT_DEADLINE',
  'SCHEDULE_TABLE',
] as const;
