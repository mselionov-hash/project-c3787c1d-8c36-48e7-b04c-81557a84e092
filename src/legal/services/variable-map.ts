/**
 * Variable-to-source mapping layer.
 * Maps every known template variable to its source of truth and classification.
 *
 * Classifications:
 * - scalar_printed: direct value printed in document
 * - derived_printed: computed from other data, then printed
 * - document_metadata: not from user input, document-level
 * - render_block: repeating block / table rows
 * - conditional_flag: controls [[IF]] block inclusion
 * - system_only: internal, never shown to user
 */

export const VARIABLE_CLASSES = {
  SCALAR_PRINTED: 'scalar_printed',
  DERIVED_PRINTED: 'derived_printed',
  DOCUMENT_METADATA: 'document_metadata',
  RENDER_BLOCK: 'render_block',
  CONDITIONAL_FLAG: 'conditional_flag',
  SYSTEM_ONLY: 'system_only',
} as const;

export type VariableClass = typeof VARIABLE_CLASSES[keyof typeof VARIABLE_CLASSES];

export const VARIABLE_SOURCES = {
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
} as const;

export type VariableSource = typeof VARIABLE_SOURCES[keyof typeof VARIABLE_SOURCES];

export interface VariableMapping {
  readonly name: string;
  readonly variableClass: VariableClass;
  readonly source: VariableSource;
  /** DB column or derivation description */
  readonly sourceDetail: string;
  /** Whether a signing-time snapshot is the authoritative source for documents */
  readonly usesSnapshot: boolean;
}

/**
 * Complete variable catalog mapping.
 * Every variable used in any runtime template is listed here.
 */
export const VARIABLE_MAP: readonly VariableMapping[] = [
  // === Party profile fields (snapshot-backed) ===
  { name: 'LENDER_FULL_NAME', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.full_name', usesSnapshot: true },
  { name: 'LENDER_DOB', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.date_of_birth', usesSnapshot: true },
  { name: 'LENDER_PASSPORT_SERIES', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_series', usesSnapshot: true },
  { name: 'LENDER_PASSPORT_NUMBER', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_number', usesSnapshot: true },
  { name: 'LENDER_PASSPORT_ISSUED_BY', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_issued_by', usesSnapshot: true },
  { name: 'LENDER_PASSPORT_ISSUE_DATE', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_issue_date', usesSnapshot: true },
  { name: 'LENDER_PASSPORT_DIVISION_CODE', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_division_code', usesSnapshot: true },
  { name: 'LENDER_REG_ADDRESS', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.address', usesSnapshot: true },
  { name: 'LENDER_CONTACT_PHONE', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.phone', usesSnapshot: true },
  { name: 'LENDER_EMAIL', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'auth.users.email', usesSnapshot: true },
  { name: 'LENDER_APP_ACCOUNT_ID', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.user_id', usesSnapshot: true },

  { name: 'BORROWER_FULL_NAME', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.full_name', usesSnapshot: true },
  { name: 'BORROWER_DOB', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.date_of_birth', usesSnapshot: true },
  { name: 'BORROWER_PASSPORT_SERIES', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_series', usesSnapshot: true },
  { name: 'BORROWER_PASSPORT_NUMBER', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_number', usesSnapshot: true },
  { name: 'BORROWER_PASSPORT_ISSUED_BY', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_issued_by', usesSnapshot: true },
  { name: 'BORROWER_PASSPORT_ISSUE_DATE', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_issue_date', usesSnapshot: true },
  { name: 'BORROWER_PASSPORT_DIVISION_CODE', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.passport_division_code', usesSnapshot: true },
  { name: 'BORROWER_REG_ADDRESS', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.address', usesSnapshot: true },
  { name: 'BORROWER_CONTACT_PHONE', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.phone', usesSnapshot: true },
  { name: 'BORROWER_EMAIL', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'auth.users.email', usesSnapshot: true },
  { name: 'BORROWER_APP_ACCOUNT_ID', variableClass: 'scalar_printed', source: 'profile', sourceDetail: 'profiles.user_id', usesSnapshot: true },

  // === Contract/loan fields (snapshot-backed) ===
  { name: 'CONTRACT_NUMBER', variableClass: 'scalar_printed', source: 'loan', sourceDetail: 'loans.contract_number', usesSnapshot: true },
  { name: 'CONTRACT_PLACE', variableClass: 'scalar_printed', source: 'loan', sourceDetail: 'loans.city', usesSnapshot: true },
  { name: 'LOAN_AMOUNT', variableClass: 'scalar_printed', source: 'loan', sourceDetail: 'loans.amount', usesSnapshot: true },
  { name: 'INTEREST_RATE_ANNUAL', variableClass: 'scalar_printed', source: 'loan', sourceDetail: 'loans.interest_rate', usesSnapshot: true },
  { name: 'FINAL_REPAYMENT_DEADLINE', variableClass: 'scalar_printed', source: 'loan', sourceDetail: 'loans.repayment_date', usesSnapshot: true },
  { name: 'EARLY_REPAYMENT_NOTICE_DAYS', variableClass: 'scalar_printed', source: 'loan', sourceDetail: 'loans.early_repayment_notice_days', usesSnapshot: true },

  // === Conditional flags from loan ===
  { name: 'INTEREST_MODE', variableClass: 'conditional_flag', source: 'loan', sourceDetail: 'loans.interest_mode', usesSnapshot: true },
  { name: 'INTEREST_PAYMENT_SCHEDULE', variableClass: 'conditional_flag', source: 'loan', sourceDetail: 'loans.interest_payment_schedule', usesSnapshot: true },
  { name: 'REPAYMENT_SCHEDULE_TYPE', variableClass: 'conditional_flag', source: 'loan', sourceDetail: 'loans.repayment_schedule_type', usesSnapshot: true },

  // === Derived printed values ===
  { name: 'LOAN_AMOUNT_IN_WORDS', variableClass: 'derived_printed', source: 'derived', sourceDetail: 'loans.amount → number-to-words formatter', usesSnapshot: false },
  { name: 'TRANCHE_AMOUNT_IN_WORDS', variableClass: 'derived_printed', source: 'derived', sourceDetail: 'loan_tranches.amount → number-to-words formatter', usesSnapshot: false },

  // === Platform config constants ===
  { name: 'PLATFORM_NAME', variableClass: 'document_metadata', source: 'platform_config', sourceDetail: 'hardcoded platform config', usesSnapshot: false },
  { name: 'PLATFORM_URL', variableClass: 'document_metadata', source: 'platform_config', sourceDetail: 'hardcoded platform config', usesSnapshot: false },
  { name: 'PLATFORM_OPERATOR_NAME', variableClass: 'document_metadata', source: 'platform_config', sourceDetail: 'hardcoded platform config', usesSnapshot: false },
  { name: 'LOAN_CURRENCY', variableClass: 'scalar_printed', source: 'platform_config', sourceDetail: 'hardcoded RUB', usesSnapshot: false },
  { name: 'DAY_COUNT_BASIS', variableClass: 'scalar_printed', source: 'platform_config', sourceDetail: 'hardcoded 365/366', usesSnapshot: false },
  { name: 'DISBURSEMENT_REFERENCE_RULE', variableClass: 'scalar_printed', source: 'platform_config', sourceDetail: 'platform config constant', usesSnapshot: false },
  { name: 'PAYMENT_REFERENCE_RULE', variableClass: 'scalar_printed', source: 'platform_config', sourceDetail: 'platform config constant', usesSnapshot: false },
  { name: 'LENDER_CO_SIGNATURE_ENABLED', variableClass: 'conditional_flag', source: 'platform_config', sourceDetail: 'default NO in MVP', usesSnapshot: false },
  { name: 'PAYMENT_PROOF_ATTACHMENT_ENABLED', variableClass: 'conditional_flag', source: 'platform_config', sourceDetail: 'default NO in MVP', usesSnapshot: false },

  // === Document metadata ===
  { name: 'CONTRACT_DATE', variableClass: 'document_metadata', source: 'loan', sourceDetail: 'loans.issue_date or loans.created_at', usesSnapshot: true },
  { name: 'LAST_SIGNATURE_AT', variableClass: 'document_metadata', source: 'signature', sourceDetail: 'max(loan_signatures.signed_at)', usesSnapshot: false },
  { name: 'RECEIPT_TITLE', variableClass: 'document_metadata', source: 'platform_config', sourceDetail: 'hardcoded: Расписка о получении Транша', usesSnapshot: false },
  { name: 'TRANCHE_RECEIPT_DRAFT_CREATED_AT', variableClass: 'document_metadata', source: 'generated_document', sourceDetail: 'generated_documents.created_at', usesSnapshot: false },
  { name: 'TRANCHE_RECEIPT_SIGNED_AT', variableClass: 'document_metadata', source: 'signature', sourceDetail: 'tranche receipt signature timestamp', usesSnapshot: false },
  { name: 'TRANCHE_RECEIPT_NUMBER', variableClass: 'scalar_printed', source: 'generated_document', sourceDetail: 'generated_documents sequence', usesSnapshot: false },

  // === Tranche fields ===
  { name: 'TRANCHE_ID', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.id', usesSnapshot: false },
  { name: 'TRANCHE_AMOUNT', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.amount', usesSnapshot: false },
  { name: 'TRANCHE_CURRENCY', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.currency', usesSnapshot: false },
  { name: 'TRANCHE_DATE', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.actual_date', usesSnapshot: false },
  { name: 'TRANCHE_TIME', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.actual_time', usesSnapshot: false },
  { name: 'TRANCHE_TIMEZONE', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.timezone', usesSnapshot: false },
  { name: 'TRANCHE_METHOD', variableClass: 'conditional_flag', source: 'tranche', sourceDetail: 'loan_tranches.method', usesSnapshot: false },
  { name: 'TRANCHE_SENDER_ACCOUNT_DISPLAY', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.sender_account_display', usesSnapshot: false },
  { name: 'TRANCHE_RECEIVER_ACCOUNT_DISPLAY', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.receiver_account_display', usesSnapshot: false },
  { name: 'TRANCHE_REFERENCE_TEXT', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.reference_text', usesSnapshot: false },
  { name: 'TRANCHE_BANK_DOCUMENT_ID', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.bank_document_id', usesSnapshot: false },
  { name: 'TRANCHE_BANK_DOCUMENT_DATE', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.bank_document_date', usesSnapshot: false },
  { name: 'TRANCHE_TRANSFER_SOURCE', variableClass: 'scalar_printed', source: 'tranche', sourceDetail: 'loan_tranches.transfer_source', usesSnapshot: false },

  // === Render blocks ===
  { name: 'ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS_TABLE', variableClass: 'render_block', source: 'bank_details', sourceDetail: 'loan_allowed_bank_details + bank_details snapshot', usesSnapshot: true },
  { name: 'ALLOWED_BORROWER_RECEIVING_ACCOUNTS_TABLE', variableClass: 'render_block', source: 'bank_details', sourceDetail: 'loan_allowed_bank_details + bank_details snapshot', usesSnapshot: true },
  { name: 'ALLOWED_LENDER_RECEIVING_ACCOUNTS_TABLE', variableClass: 'render_block', source: 'bank_details', sourceDetail: 'loan_allowed_bank_details + bank_details snapshot', usesSnapshot: true },
  { name: 'NOTICE_SNAPSHOT_TABLE', variableClass: 'render_block', source: 'snapshot', sourceDetail: 'party snapshot: email, phone, address, app ID', usesSnapshot: true },
  { name: 'SCHEDULE_TABLE', variableClass: 'render_block', source: 'schedule', sourceDetail: 'payment_schedule_items', usesSnapshot: false },
  { name: 'LENDER_SIGNATURE_BLOCK', variableClass: 'render_block', source: 'signature', sourceDetail: 'loan_signatures data + render', usesSnapshot: false },
  { name: 'BORROWER_SIGNATURE_BLOCK', variableClass: 'render_block', source: 'signature', sourceDetail: 'loan_signatures data + render', usesSnapshot: false },
  { name: 'LENDER_SIGNATURE_BLOCK_OPTIONAL', variableClass: 'render_block', source: 'signature', sourceDetail: 'loan_signatures data + render (optional)', usesSnapshot: false },
] as const;

/** Get variable mapping by name */
export function getVariableMapping(name: string): VariableMapping | undefined {
  return VARIABLE_MAP.find(v => v.name === name);
}

/** Get all variables for a given source */
export function getVariablesBySource(source: VariableSource): readonly VariableMapping[] {
  return VARIABLE_MAP.filter(v => v.source === source);
}

/** Get all variables for a given class */
export function getVariablesByClass(variableClass: VariableClass): readonly VariableMapping[] {
  return VARIABLE_MAP.filter(v => v.variableClass === variableClass);
}

/** Get all snapshot-backed variables */
export function getSnapshotVariables(): readonly VariableMapping[] {
  return VARIABLE_MAP.filter(v => v.usesSnapshot);
}
