/**
 * Canonical variable registry for TZ v2.2.
 * Every placeholder that may appear in any template is listed here.
 * Variables marked status:'deferred' are recognized but not yet resolved.
 */

import type { VariableDefinition } from './types';

/** Helper to define a variable concisely */
function v(
  name: string,
  variableClass: VariableDefinition['variableClass'],
  source: VariableDefinition['source'],
  sourceDetail: string,
  usesSnapshot: boolean,
  documents: readonly string[],
  status: 'implemented' | 'deferred' = 'implemented',
): VariableDefinition {
  return { name, variableClass, source, sourceDetail, usesSnapshot, documents, status };
}

const C = 'loan_contract';
const T = 'tranche_receipt';
const A1 = 'appendix_bank_details';
const A2 = 'appendix_repayment_schedule';
const A4 = 'partial_repayment_confirmation';
const A5 = 'full_repayment_confirmation';
const A6 = 'unep_agreement';
const P = 'partial_repayment_confirmation';
const F = 'full_repayment_confirmation';
const EDO = 'edo_regulation';

// ── Party profile variables (lender) ────────────────────────────────

const LENDER_PROFILE_VARS: VariableDefinition[] = [
  v('LENDER_FULL_NAME', 'scalar_printed', 'profile', 'profiles.full_name', true, [C, T, A1, P, F, A6]),
  v('LENDER_DOB', 'scalar_printed', 'profile', 'profiles.date_of_birth', true, [C, T]),
  v('LENDER_PASSPORT_SERIES', 'scalar_printed', 'profile', 'profiles.passport_series', true, [C, T, F]),
  v('LENDER_PASSPORT_NUMBER', 'scalar_printed', 'profile', 'profiles.passport_number', true, [C, T, F]),
  v('LENDER_PASSPORT_ISSUED_BY', 'scalar_printed', 'profile', 'profiles.passport_issued_by', true, [C, T]),
  v('LENDER_PASSPORT_ISSUE_DATE', 'scalar_printed', 'profile', 'profiles.passport_issue_date', true, [C, T]),
  v('LENDER_PASSPORT_DIVISION_CODE', 'scalar_printed', 'profile', 'profiles.passport_division_code', true, [C, T]),
  v('LENDER_REG_ADDRESS', 'scalar_printed', 'profile', 'profiles.address', true, [C, T, F]),
  v('LENDER_CONTACT_PHONE', 'scalar_printed', 'profile', 'profiles.phone', true, [C, T]),
  v('LENDER_EMAIL', 'scalar_printed', 'profile', 'auth.users.email', true, [C, T]),
  v('LENDER_APP_ACCOUNT_ID', 'scalar_printed', 'profile', 'profiles.user_id', true, [C, T, A6]),
];

// ── Party profile variables (borrower) ──────────────────────────────

const BORROWER_PROFILE_VARS: VariableDefinition[] = [
  v('BORROWER_FULL_NAME', 'scalar_printed', 'profile', 'profiles.full_name', true, [C, T, A1, P, F, A6]),
  v('BORROWER_DOB', 'scalar_printed', 'profile', 'profiles.date_of_birth', true, [C, T]),
  v('BORROWER_PASSPORT_SERIES', 'scalar_printed', 'profile', 'profiles.passport_series', true, [C, T, F]),
  v('BORROWER_PASSPORT_NUMBER', 'scalar_printed', 'profile', 'profiles.passport_number', true, [C, T, F]),
  v('BORROWER_PASSPORT_ISSUED_BY', 'scalar_printed', 'profile', 'profiles.passport_issued_by', true, [C, T]),
  v('BORROWER_PASSPORT_ISSUE_DATE', 'scalar_printed', 'profile', 'profiles.passport_issue_date', true, [C, T]),
  v('BORROWER_PASSPORT_DIVISION_CODE', 'scalar_printed', 'profile', 'profiles.passport_division_code', true, [C, T]),
  v('BORROWER_REG_ADDRESS', 'scalar_printed', 'profile', 'profiles.address', true, [C, T, F]),
  v('BORROWER_CONTACT_PHONE', 'scalar_printed', 'profile', 'profiles.phone', true, [C, T]),
  v('BORROWER_EMAIL', 'scalar_printed', 'profile', 'auth.users.email', true, [C, T]),
  v('BORROWER_APP_ACCOUNT_ID', 'scalar_printed', 'profile', 'profiles.user_id', true, [C, T, A6]),
];

// ── Contract/loan fields ────────────────────────────────────────────

const CONTRACT_VARS: VariableDefinition[] = [
  v('CONTRACT_NUMBER', 'scalar_printed', 'loan', 'loans.contract_number', true, [C, T, A1, A2, P, F, A6]),
  v('CONTRACT_PLACE', 'scalar_printed', 'loan', 'loans.city', true, [C]),
  v('CONTRACT_DATE', 'document_metadata', 'loan', 'loans.issue_date', true, [C, T, A6]),
  v('LOAN_AMOUNT', 'scalar_printed', 'loan', 'loans.amount', true, [C, A2]),
  v('LOAN_AMOUNT_IN_WORDS', 'derived_printed', 'derived', 'loans.amount → number-to-words', false, [C, A2]),
  v('LOAN_CURRENCY', 'scalar_printed', 'platform_config', 'hardcoded RUB', false, [C, A2, P, F]),
  v('INTEREST_RATE_ANNUAL', 'scalar_printed', 'loan', 'loans.interest_rate', true, [C, A2]),
  v('DAY_COUNT_BASIS', 'scalar_printed', 'platform_config', 'hardcoded 365/366', false, [C]),
  v('EARLY_REPAYMENT_NOTICE_DAYS', 'scalar_printed', 'loan', 'loans.early_repayment_notice_days', true, [C]),
  v('FINAL_REPAYMENT_DEADLINE', 'scalar_printed', 'loan', 'loans.repayment_date', true, [C, A2]),
  v('LOAN_TYPE', 'scalar_printed', 'loan', 'loans.loan_type', false, [C]),
  v('INTEREST_ACCRUAL_START', 'scalar_printed', 'platform_config', 'hardcoded FROM_EACH_TRANCHE_DATE', false, [C]),
  v('EARLY_REPAYMENT_INTEREST_RULE', 'scalar_printed', 'platform_config', 'hardcoded ACCRUED_TO_DATE', false, [C]),
];

// ── Conditional flags ───────────────────────────────────────────────

const CONDITIONAL_FLAG_VARS: VariableDefinition[] = [
  v('INTEREST_MODE', 'conditional_flag', 'loan', 'loans.interest_mode', true, [C, A2]),
  v('INTEREST_PAYMENT_SCHEDULE', 'conditional_flag', 'loan', 'loans.interest_payment_schedule', true, [C]),
  v('REPAYMENT_SCHEDULE_TYPE', 'conditional_flag', 'loan', 'loans.repayment_schedule_type', true, [C]),
  v('TRANCHE_METHOD', 'conditional_flag', 'tranche', 'loan_tranches.method', false, [T]),
  v('LENDER_CO_SIGNATURE_ENABLED', 'conditional_flag', 'platform_config', 'default NO', false, [T]),
  v('PAYMENT_PROOF_ATTACHMENT_ENABLED', 'conditional_flag', 'platform_config', 'default NO', false, [T]),
  v('SIGNATURE_SCHEME_REQUESTED', 'conditional_flag', 'loan', 'loans.signature_scheme_requested', true, [C, A6]),
  v('SIGNATURE_SCHEME_EFFECTIVE', 'conditional_flag', 'package', 'signature_packages.signature_scheme_effective', false, [C]),
  v('BORROWER_DISBURSEMENT_RECEIPT_POLICY', 'conditional_flag', 'loan', 'loans.borrower_disbursement_receipt_policy', true, [C, A1]),
  v('LENDER_REPAYMENT_RECEIPT_POLICY', 'conditional_flag', 'loan', 'loans.lender_repayment_receipt_policy', true, [C, A1]),
];

// ── Platform config ─────────────────────────────────────────────────

const PLATFORM_CONFIG_VARS: VariableDefinition[] = [
  v('PLATFORM_NAME', 'document_metadata', 'platform_config', 'hardcoded', false, [C, T, A6, EDO]),
  v('PLATFORM_URL', 'document_metadata', 'platform_config', 'hardcoded', false, [C, T, A6, EDO]),
  v('PLATFORM_OPERATOR_NAME', 'document_metadata', 'platform_config', 'hardcoded', false, [C, T, A6, EDO]),
  v('PLATFORM_BRAND_NAME', 'document_metadata', 'platform_config', 'hardcoded', false, [C, A6, EDO]),
  v('PLATFORM_OPERATOR_LEGAL_DETAILS', 'document_metadata', 'platform_config', 'hardcoded', false, [EDO]),
  v('SUPPORT_CONTACTS_TEXT', 'document_metadata', 'platform_config', 'hardcoded', false, [EDO]),
  v('CONTRACT_LANGUAGE', 'system_only', 'platform_config', 'hardcoded ru', false, [C]),
  v('DISBURSEMENT_REFERENCE_RULE', 'scalar_printed', 'platform_config', 'platform config', false, [C]),
  v('PAYMENT_REFERENCE_RULE', 'scalar_printed', 'platform_config', 'platform config', false, [C]),
  v('RECEIPT_TITLE', 'document_metadata', 'platform_config', 'hardcoded', false, [T]),
];

// ── Document metadata ───────────────────────────────────────────────

const DOCUMENT_METADATA_VARS: VariableDefinition[] = [
  v('LAST_SIGNATURE_AT', 'document_metadata', 'signature', 'max(loan_signatures.signed_at)', false, [C, T]),
  v('TRANCHE_RECEIPT_DRAFT_CREATED_AT', 'document_metadata', 'generated_document', 'generated_documents.created_at', false, [T]),
  v('TRANCHE_RECEIPT_SIGNED_AT', 'document_metadata', 'signature', 'tranche receipt signature', false, [T]),
  v('TRANCHE_RECEIPT_NUMBER', 'scalar_printed', 'generated_document', 'sequence', false, [T]),
  v('APPENDIX_DATE', 'document_metadata', 'derived', 'generation timestamp', false, [A1, A2]),
  v('CONFIRMATION_DATE', 'document_metadata', 'derived', 'generation timestamp', false, [P, F]),
];

// ── Tranche fields ──────────────────────────────────────────────────

const TRANCHE_VARS: VariableDefinition[] = [
  v('TRANCHE_ID', 'scalar_printed', 'tranche', 'loan_tranches.id', false, [T]),
  v('TRANCHE_AMOUNT', 'scalar_printed', 'tranche', 'loan_tranches.amount', false, [T]),
  v('TRANCHE_AMOUNT_IN_WORDS', 'derived_printed', 'derived', 'loan_tranches.amount → number-to-words', false, [T]),
  v('TRANCHE_CURRENCY', 'scalar_printed', 'tranche', 'loan_tranches.currency', false, [T]),
  v('TRANCHE_DATE', 'scalar_printed', 'tranche', 'loan_tranches.actual_date', false, [T]),
  v('TRANCHE_TIME', 'scalar_printed', 'tranche', 'loan_tranches.actual_time', false, [T]),
  v('TRANCHE_TIMEZONE', 'scalar_printed', 'tranche', 'loan_tranches.timezone', false, [T]),
  v('TRANCHE_SENDER_ACCOUNT_DISPLAY', 'scalar_printed', 'tranche', 'loan_tranches.sender_account_display', false, [T]),
  v('TRANCHE_RECEIVER_ACCOUNT_DISPLAY', 'scalar_printed', 'tranche', 'loan_tranches.receiver_account_display', false, [T]),
  v('TRANCHE_REFERENCE_TEXT', 'scalar_printed', 'tranche', 'loan_tranches.reference_text', false, [T]),
  v('TRANCHE_BANK_DOCUMENT_ID', 'scalar_printed', 'tranche', 'loan_tranches.bank_document_id', false, [T]),
  v('TRANCHE_BANK_DOCUMENT_DATE', 'scalar_printed', 'tranche', 'loan_tranches.bank_document_date', false, [T]),
  v('TRANCHE_TRANSFER_SOURCE', 'scalar_printed', 'tranche', 'loan_tranches.transfer_source', false, [T]),
  v('TRANCHE_METHOD_LABEL', 'derived_printed', 'derived', 'method → Russian label', false, [T]),
];

// ── TZ v2.2 tranche printable sub-fields (now implemented) ─────────

const TRANCHE_V22_VARS: VariableDefinition[] = [
  v('TRANCHE_RECEIVER_REQUISITE_PRINTABLE', 'scalar_printed', 'tranche', 'formatted receiver requisite', false, [T]),
  v('TRANCHE_SENDER_REQUISITE_PRINTABLE', 'scalar_printed', 'tranche', 'formatted sender requisite', false, [T]),
  v('TRANCHE_RECEIVER_SBP_ROUTE_PRINTABLE', 'scalar_printed', 'tranche', 'SBP route display', false, [T]),
  // System-only tranche fields — still deferred (not printed in templates)
  v('TRANCHE_SENDER_REQUISITE_ID', 'system_only', 'tranche', 'sender bank_detail_id', false, [T], 'deferred'),
  v('TRANCHE_RECEIPT_ID', 'system_only', 'tranche', 'generated_document id', false, [T], 'deferred'),
  v('TRANCHE_RECEIPT_STATUS', 'system_only', 'tranche', 'receipt signing status', false, [T], 'deferred'),
  v('TRANCHE_STATUS', 'system_only', 'tranche', 'loan_tranches.status', false, [T], 'deferred'),
];

// ── Render blocks ───────────────────────────────────────────────────

const RENDER_BLOCK_VARS: VariableDefinition[] = [
  v('ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS_TABLE', 'render_block', 'bank_details', 'snapshot', true, [C]),
  v('ALLOWED_BORROWER_RECEIVING_ACCOUNTS_TABLE', 'render_block', 'bank_details', 'snapshot', true, [C]),
  v('ALLOWED_LENDER_RECEIVING_ACCOUNTS_TABLE', 'render_block', 'bank_details', 'snapshot', true, [C]),
  v('LENDER_DISBURSEMENT_ACCOUNTS', 'render_block', 'bank_details', 'snapshot', true, [A1]),
  v('BORROWER_DISBURSEMENT_ACCOUNTS', 'render_block', 'bank_details', 'snapshot', true, [A1]),
  v('LENDER_REPAYMENT_ACCOUNTS', 'render_block', 'bank_details', 'snapshot', true, [A1]),
  v('BORROWER_REPAYMENT_ACCOUNTS', 'render_block', 'bank_details', 'snapshot', true, [A1]),
  v('NOTICE_SNAPSHOT_TABLE', 'render_block', 'snapshot', 'party snapshot', true, [C, A1]),
  v('SCHEDULE_TABLE', 'render_block', 'schedule', 'payment_schedule_items', false, [C, A2]),
  v('SCHEDULE_TYPE_LABEL', 'derived_printed', 'derived', 'repayment_schedule_type → label', false, [A2]),
  v('LENDER_SIGNATURE_BLOCK', 'render_block', 'signature', 'loan_signatures', false, [C, A6]),
  v('BORROWER_SIGNATURE_BLOCK', 'render_block', 'signature', 'loan_signatures', false, [C, T, A6]),
  v('LENDER_SIGNATURE_BLOCK_OPTIONAL', 'render_block', 'signature', 'loan_signatures optional', false, [T]),
  v('LENDER_CONFIRMATION_BLOCK', 'render_block', 'signature', 'confirmation block', false, [P, F]),
];

// ── Repayment confirmation variables ────────────────────────────────

const REPAYMENT_VARS: VariableDefinition[] = [
  v('REPAYMENT_AMOUNT', 'scalar_printed', 'derived', 'loan_payments.transfer_amount', false, [P]),
  v('REPAYMENT_AMOUNT_IN_WORDS', 'derived_printed', 'derived', 'amount → number-to-words', false, [P]),
  v('REPAYMENT_DATE', 'scalar_printed', 'derived', 'loan_payments.transfer_date', false, [P]),
  v('REPAYMENT_METHOD', 'scalar_printed', 'derived', 'loan_payments.transfer_method → label', false, [P]),
  v('HAS_BANK_NAME', 'conditional_flag', 'derived', 'bank_name presence', false, [P]),
  v('REPAYMENT_BANK_NAME', 'scalar_printed', 'derived', 'loan_payments.bank_name', false, [P]),
  v('HAS_TRANSACTION_ID', 'conditional_flag', 'derived', 'transaction_id presence', false, [P]),
  v('REPAYMENT_TRANSACTION_ID', 'scalar_printed', 'derived', 'loan_payments.transaction_id', false, [P]),
  v('TOTAL_DISBURSED', 'scalar_printed', 'derived', 'sum of confirmed tranches', false, [P, F]),
  v('TOTAL_DISBURSED_IN_WORDS', 'derived_printed', 'derived', 'sum → number-to-words', false, [F]),
  v('TOTAL_REPAID', 'scalar_printed', 'derived', 'sum of confirmed payments', false, [P, F]),
  v('TOTAL_REPAID_IN_WORDS', 'derived_printed', 'derived', 'sum → number-to-words', false, [F]),
  v('REMAINING_BALANCE', 'scalar_printed', 'derived', 'disbursed - repaid', false, [P]),
  v('LAST_REPAYMENT_DATE', 'scalar_printed', 'derived', 'last confirmed payment date', false, [F]),
];

// ── Deal / version / signing flow variables (TZ v2.2) ───────────────

const DEAL_VARS: VariableDefinition[] = [
  v('DEAL_VERSION', 'scalar_printed', 'deal', 'loans.deal_version', false, [C]),
  v('DEAL_ID', 'scalar_printed', 'deal', 'loans.id', false, [C, A6]),
  v('DEAL_CREATED_AT', 'scalar_printed', 'deal', 'loans.created_at', false, [C]),
  v('INITIATOR_ROLE', 'system_only', 'deal', 'loans.initiator_role', false, [C]),
  v('OFFEROR_ROLE', 'system_only', 'deal', 'derived from deal flow', false, [C]),
  v('OFFEREE_ROLE', 'system_only', 'deal', 'derived from deal flow', false, [C]),
  v('SIGNATURE_SCHEME_LABEL', 'derived_printed', 'derived', 'scheme → Russian label', false, [C, A6]),
  v('APPENDIX_6_REFERENCE', 'derived_printed', 'derived', 'APP6 ref text if applicable', false, [C]),
  v('SNAPSHOT_VERSION_LABEL', 'derived_printed', 'derived', 'snapshot version display', false, [C]),
];

// ── EDO Regulation variables ────────────────────────────────────────

const EDO_REGULATION_VARS: VariableDefinition[] = [
  v('EDO_REGULATION_NAME', 'scalar_printed', 'regulation', 'edo_regulations.title', false, [EDO, A6]),
  v('EDO_REGULATION_VERSION', 'scalar_printed', 'regulation', 'edo_regulations.version', false, [EDO, A6]),
  v('EDO_REGULATION_ID', 'scalar_printed', 'regulation', 'edo_regulations.id', false, [EDO]),
  v('EDO_REGULATION_EFFECTIVE_FROM', 'scalar_printed', 'regulation', 'edo_regulations.effective_from', false, [EDO, A6]),
];

// ── APP6 (UNEP Agreement) variables ─────────────────────────────────

const APP6_VARS: VariableDefinition[] = [
  v('APPENDIX_6_REQUIRED', 'conditional_flag', 'app6', 'derived from signature_scheme', false, [A6]),
  v('APPENDIX_6_STATUS', 'system_only', 'app6', 'unep_agreements.status', false, [A6]),
  v('APP6_CREATED_AT', 'document_metadata', 'app6', 'unep_agreements.created_at', false, [A6]),
  v('APP6_SCOPE_TEXT', 'derived_printed', 'derived', 'scope description for APP6', false, [A6]),
  v('APP6_COVERED_DOCUMENTS_TEXT', 'derived_printed', 'derived', 'list of covered doc types', false, [A6]),
  v('APP6_SIGNED_BY_LENDER_AT', 'document_metadata', 'app6', 'unep_agreements.lender_signed_at', false, [A6]),
  v('APP6_SIGNED_BY_BORROWER_AT', 'document_metadata', 'app6', 'unep_agreements.borrower_signed_at', false, [A6]),
];

// ── Debt tracking / balance variables (now implemented) ─────────────

const DEBT_VARS: VariableDefinition[] = [
  v('ACTIVE_DEBT_AMOUNT', 'scalar_printed', 'derived', 'sum of confirmed tranches - repaid', false, [P, F]),
  v('OUTSTANDING_PRINCIPAL', 'scalar_printed', 'derived', 'principal remaining', false, [P, F]),
  v('OUTSTANDING_INTEREST', 'scalar_printed', 'derived', 'interest remaining', false, [P, F]),
  v('OUTSTANDING_395_INTEREST', 'scalar_printed', 'derived', 'art. 395 interest', false, [P, F]),
  v('OUTSTANDING_COSTS', 'scalar_printed', 'derived', 'creditor costs', false, [P, F]),
];

// ── Package variables ───────────────────────────────────────────────

const PACKAGE_VARS: VariableDefinition[] = [
  v('PACKAGE_STATUS', 'system_only', 'package', 'signature_packages.package_status', false, []),
  v('DOCUMENT_STATUS', 'system_only', 'generated_document', 'document instance status', false, [], 'deferred'),
];

// ── System / evidence fields (deferred — not printed in templates) ──

const SYSTEM_EVIDENCE_VARS: VariableDefinition[] = [
  v('TEMPLATE_VERSION', 'system_only', 'generated_document', 'template version', false, [], 'deferred'),
  v('RULES_VERSION', 'system_only', 'platform_config', 'rules version', false, [], 'deferred'),
  v('DOCUMENT_HASH', 'system_only', 'generated_document', 'hash of document', false, [], 'deferred'),
  v('SIGNED_CONTAINER', 'system_only', 'signature', 'signed container', false, [], 'deferred'),
  v('CERTIFICATE_SNAPSHOT', 'system_only', 'signature', 'cert snapshot', false, [], 'deferred'),
  v('SIGNATURE_VALIDATION_RESULT', 'system_only', 'signature', 'validation result', false, [], 'deferred'),
  v('TRUSTED_TIMESTAMP', 'system_only', 'signature', 'trusted timestamp', false, [], 'deferred'),
  v('EVENT_LOG_ID', 'system_only', 'generated_document', 'event log id', false, [], 'deferred'),
  v('SNAPSHOT_ID', 'system_only', 'snapshot', 'signing_snapshots.id', false, [], 'deferred'),
  v('SNAPSHOT_HASH', 'system_only', 'snapshot', 'computed hash', false, [], 'deferred'),
];

// ── Allowed bank details aliases (new naming from TZ v2.2) ──────────

const BANK_DETAIL_ALIAS_VARS: VariableDefinition[] = [
  v('ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS', 'render_block', 'bank_details', 'snapshot alias', true, [C]),
  v('ALLOWED_BORROWER_RECEIVING_ACCOUNTS', 'render_block', 'bank_details', 'snapshot alias', true, [C]),
  v('ALLOWED_LENDER_RECEIVING_ACCOUNTS', 'render_block', 'bank_details', 'snapshot alias', true, [C]),
];

// ═══════════════════════════════════════════════════════════════════
// Assembled canonical registry
// ═══════════════════════════════════════════════════════════════════

const ALL_VARS: VariableDefinition[] = [
  ...LENDER_PROFILE_VARS,
  ...BORROWER_PROFILE_VARS,
  ...CONTRACT_VARS,
  ...CONDITIONAL_FLAG_VARS,
  ...PLATFORM_CONFIG_VARS,
  ...DOCUMENT_METADATA_VARS,
  ...TRANCHE_VARS,
  ...TRANCHE_V22_VARS,
  ...RENDER_BLOCK_VARS,
  ...REPAYMENT_VARS,
  ...DEAL_VARS,
  ...EDO_REGULATION_VARS,
  ...APP6_VARS,
  ...DEBT_VARS,
  ...PACKAGE_VARS,
  ...SYSTEM_EVIDENCE_VARS,
  ...BANK_DETAIL_ALIAS_VARS,
];

/**
 * Canonical variable registry keyed by variable name.
 */
export const CANONICAL_VARIABLES: Record<string, VariableDefinition> = {};
for (const def of ALL_VARS) {
  CANONICAL_VARIABLES[def.name] = def;
}

/** All variable names */
export const ALL_VARIABLE_NAMES = Object.keys(CANONICAL_VARIABLES);

/** Count of all variables */
export const TOTAL_VARIABLE_COUNT = ALL_VARIABLE_NAMES.length;

/** Variables by status */
export const IMPLEMENTED_VARIABLES = ALL_VARIABLE_NAMES.filter(
  n => CANONICAL_VARIABLES[n].status === 'implemented'
);
export const DEFERRED_VARIABLES = ALL_VARIABLE_NAMES.filter(
  n => CANONICAL_VARIABLES[n].status === 'deferred'
);

/**
 * Conditional variables — control [[IF]] / [При] block inclusion.
 */
export const CONDITIONAL_VARS = new Set(
  ALL_VARS
    .filter(v => v.variableClass === 'conditional_flag')
    .map(v => v.name)
);

/**
 * Check if a variable name is known in the canonical registry.
 */
export function isCanonicalVariable(name: string): boolean {
  return name in CANONICAL_VARIABLES;
}

/**
 * Get variable definition from canonical registry.
 */
export function getCanonicalVariable(name: string): VariableDefinition | undefined {
  return CANONICAL_VARIABLES[name];
}
