/**
 * Runtime text template: Подтверждение полного погашения
 * Variables: contract_number, total_repaid, final_repayment_date,
 *   lender_name, borrower_name, confirmation_date
 *
 * TODO: Final legal text to be defined in Phase 4.
 * This is a safe placeholder. Do not use for production document generation.
 */

export const FULL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION = '0.1-placeholder';

export const FULL_REPAYMENT_CONFIRMATION_TEMPLATE = `Подтверждение полного погашения
по Договору денежного займа № {CONTRACT_NUMBER}

<!-- TODO: Phase 4 — final legal text covering:
  - Total amount repaid (principal + interest)
  - Final repayment date
  - Statement that all obligations are fulfilled
  - Party identification (lender + borrower)
  - Signature blocks
-->

[Placeholder — awaiting final legal text]
`;

export const FULL_REPAYMENT_CONFIRMATION_VARIABLES = [
  'CONTRACT_NUMBER',
] as const;
