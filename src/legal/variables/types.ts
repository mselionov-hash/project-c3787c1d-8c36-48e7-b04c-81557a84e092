/**
 * Type definitions for the canonical variable registry (TZ v2.2).
 */

// ── Signature scheme enums ──────────────────────────────────────────

export const SIGNATURE_SCHEME = {
  UKEP_ONLY: 'UKEP_ONLY',
  UNEP_WITH_APPENDIX_6: 'UNEP_WITH_APPENDIX_6',
} as const;

export type SignatureScheme = typeof SIGNATURE_SCHEME[keyof typeof SIGNATURE_SCHEME];

export const SIGNATURE_SCHEME_EFFECTIVE = {
  UKEP_ONLY: 'UKEP_ONLY',
  UNEP_WITH_APPENDIX_6: 'UNEP_WITH_APPENDIX_6',
  UNEP_WITH_APPENDIX_6_PENDING: 'UNEP_WITH_APPENDIX_6_PENDING',
  PENDING: 'PENDING',
} as const;

export type SignatureSchemeEffective =
  typeof SIGNATURE_SCHEME_EFFECTIVE[keyof typeof SIGNATURE_SCHEME_EFFECTIVE];

// ── Receipt policy enums ────────────────────────────────────────────

export const RECEIPT_POLICY = {
  BANK_TRANSFER_ONLY: 'BANK_TRANSFER_ONLY',
  SBP_ONLY: 'SBP_ONLY',
  BANK_TRANSFER_OR_SBP: 'BANK_TRANSFER_OR_SBP',
} as const;

export type ReceiptPolicy = typeof RECEIPT_POLICY[keyof typeof RECEIPT_POLICY];

// ── Package status enums ────────────────────────────────────────────

export const PACKAGE_STATUS = {
  DRAFT: 'draft',
  GENERATING: 'generating',
  PENDING_SIGNATURES: 'pending_signatures',
  PARTIALLY_SIGNED: 'partially_signed',
  FULLY_SIGNED: 'fully_signed',
  CLOSED: 'closed',
} as const;

export type PackageStatus = typeof PACKAGE_STATUS[keyof typeof PACKAGE_STATUS];

// ── APP6 status enums ───────────────────────────────────────────────

export const APP6_STATUS = {
  NOT_APPLICABLE: 'not_applicable',
  PENDING: 'pending',
  SIGNED_BY_LENDER: 'signed_by_lender',
  SIGNED_BY_BORROWER: 'signed_by_borrower',
  COMPLETED: 'completed',
} as const;

export type App6Status = typeof APP6_STATUS[keyof typeof APP6_STATUS];

// ── Loan status enums (canonical TZ v2.2) ───────────────────────────

export const LOAN_STATUS = {
  DRAFT: 'draft',
  SENT_FOR_REVIEW: 'sent_for_review',
  COUNTERPARTY_DATA_PENDING: 'counterparty_data_pending',
  SUPERSEDED: 'superseded',
  SNAPSHOT_FROZEN: 'snapshot_frozen',
  SIGNING: 'signing',
  SIGNED_NO_DEBT: 'signed_no_debt',
  ACTIVE_WITH_DEBT: 'active_with_debt',
  CLOSED: 'closed',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export type LoanStatus = typeof LOAN_STATUS[keyof typeof LOAN_STATUS];

// ── Variable definition types ───────────────────────────────────────

export const VARIABLE_CLASS = {
  SCALAR_PRINTED: 'scalar_printed',
  DERIVED_PRINTED: 'derived_printed',
  DOCUMENT_METADATA: 'document_metadata',
  RENDER_BLOCK: 'render_block',
  CONDITIONAL_FLAG: 'conditional_flag',
  SYSTEM_ONLY: 'system_only',
} as const;

export type VariableClass = typeof VARIABLE_CLASS[keyof typeof VARIABLE_CLASS];

export const VARIABLE_SOURCE = {
  PROFILE: 'profile',
  LOAN: 'loan',
  TRANCHE: 'tranche',
  SCHEDULE: 'schedule',
  PLATFORM_CONFIG: 'platform_config',
  GENERATED_DOCUMENT: 'generated_document',
  SIGNATURE: 'signature',
  BANK_DETAILS: 'bank_details',
  SNAPSHOT: 'snapshot',
  DERIVED: 'derived',
  APP6: 'app6',
  REGULATION: 'regulation',
  PACKAGE: 'package',
  DEAL: 'deal',
} as const;

export type VariableSource = typeof VARIABLE_SOURCE[keyof typeof VARIABLE_SOURCE];

export const DOCUMENT_SCOPE = {
  /** Document generated per-loan */
  LOAN: 'loan',
  /** Platform-wide, non-personalized document */
  PLATFORM: 'platform',
} as const;

export type DocumentScope = typeof DOCUMENT_SCOPE[keyof typeof DOCUMENT_SCOPE];

export interface VariableDefinition {
  readonly name: string;
  readonly variableClass: VariableClass;
  readonly source: VariableSource;
  readonly sourceDetail: string;
  readonly usesSnapshot: boolean;
  /** Which document types use this variable */
  readonly documents: readonly string[];
  /** Whether this variable is implemented or deferred */
  readonly status: 'implemented' | 'deferred';
}

// ── Initiator / offeror role enums ──────────────────────────────────

export const INITIATOR_ROLE = {
  LENDER: 'lender',
  BORROWER: 'borrower',
} as const;

export type InitiatorRole = typeof INITIATOR_ROLE[keyof typeof INITIATOR_ROLE];

// ── Loan type enums ─────────────────────────────────────────────────

export const LOAN_TYPE = {
  INDIVIDUAL_TO_INDIVIDUAL: 'INDIVIDUAL_TO_INDIVIDUAL',
} as const;

export type LoanType = typeof LOAN_TYPE[keyof typeof LOAN_TYPE];

// ── Interest accrual start ──────────────────────────────────────────

export const INTEREST_ACCRUAL_START = {
  FROM_EACH_TRANCHE_DATE: 'FROM_EACH_TRANCHE_DATE',
} as const;

// ── Early repayment interest rule ───────────────────────────────────

export const EARLY_REPAYMENT_INTEREST_RULE = {
  ACCRUED_TO_DATE: 'ACCRUED_TO_DATE',
} as const;
