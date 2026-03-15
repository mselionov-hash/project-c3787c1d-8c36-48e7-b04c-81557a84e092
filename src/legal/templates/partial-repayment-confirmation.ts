/**
 * Runtime text template: Подтверждение частичного погашения
 * Variables: contract_number, repayment_amount, repayment_date,
 *   total_repaid, remaining_balance, lender_name, borrower_name
 *
 * TODO: Final legal text to be defined in Phase 4.
 * This is a safe placeholder. Do not use for production document generation.
 */

export const PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION = '0.1-placeholder';

export const PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE = `Подтверждение частичного погашения
по Договору денежного займа № {CONTRACT_NUMBER}

<!-- TODO: Phase 4 — final legal text covering:
  - Repayment amount and date
  - Running total of repaid principal
  - Remaining balance
  - Party identification (lender + borrower)
  - Signature blocks
-->

[Placeholder — awaiting final legal text]
`;

export const PARTIAL_REPAYMENT_CONFIRMATION_VARIABLES = [
  'CONTRACT_NUMBER',
] as const;
