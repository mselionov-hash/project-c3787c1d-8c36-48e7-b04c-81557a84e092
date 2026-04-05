/**
 * Variable registry — public API.
 * Re-exports types, canonical registry, and alias utilities.
 */

// Types & enums
export {
  SIGNATURE_SCHEME,
  SIGNATURE_SCHEME_EFFECTIVE,
  RECEIPT_POLICY,
  PACKAGE_STATUS,
  APP6_STATUS,
  LOAN_STATUS,
  VARIABLE_CLASS,
  VARIABLE_SOURCE,
  DOCUMENT_SCOPE,
  INITIATOR_ROLE,
  LOAN_TYPE,
  INTEREST_ACCRUAL_START,
  EARLY_REPAYMENT_INTEREST_RULE,
} from './types';

export type {
  SignatureScheme,
  SignatureSchemeEffective,
  ReceiptPolicy,
  PackageStatus,
  App6Status,
  LoanStatus,
  VariableClass,
  VariableSource,
  DocumentScope,
  VariableDefinition,
  InitiatorRole,
  LoanType,
} from './types';

// Canonical registry
export {
  CANONICAL_VARIABLES,
  ALL_VARIABLE_NAMES,
  TOTAL_VARIABLE_COUNT,
  IMPLEMENTED_VARIABLES,
  DEFERRED_VARIABLES,
  CONDITIONAL_VARS,
  isCanonicalVariable,
  getCanonicalVariable,
} from './canonical';

// Aliases
export {
  VARIABLE_ALIASES,
  DEPRECATED_VARIABLES,
  applyAliases,
  isDeprecatedVariable,
  resolveAlias,
} from './aliases';
