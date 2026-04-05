/**
 * Deal logic service — TZ v2.2 deal versioning and role helpers.
 */

import { INITIATOR_ROLE } from '../variables';

/**
 * Get the offeror role for a given deal version.
 * In version 1, the offeror is always the initiator.
 * In subsequent versions, the offeror is the party who last modified terms.
 */
export function getOfferorRole(
  initiatorRole: string,
  dealVersion: number,
  lastModifiedBy?: string
): string {
  if (dealVersion <= 1 || !lastModifiedBy) {
    return initiatorRole;
  }
  return lastModifiedBy;
}

/**
 * Get the offeree role (opposite of offeror).
 */
export function getOffereeRole(offerorRole: string): string {
  return offerorRole === INITIATOR_ROLE.LENDER
    ? INITIATOR_ROLE.BORROWER
    : INITIATOR_ROLE.LENDER;
}

/**
 * Get human-readable role label.
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case INITIATOR_ROLE.LENDER:
      return 'Займодавец';
    case INITIATOR_ROLE.BORROWER:
      return 'Заёмщик';
    default:
      return role;
  }
}

/**
 * Check if a deal version change is required when terms are modified.
 * Material terms that trigger a new version: amount, rate, deadline,
 * schedule, receipt policies, signature scheme, requisites.
 */
export function requiresNewDealVersion(
  changedFields: string[]
): boolean {
  const materialFields = new Set([
    'amount',
    'interest_rate',
    'repayment_date',
    'repayment_schedule_type',
    'interest_mode',
    'interest_payment_schedule',
    'borrower_disbursement_receipt_policy',
    'lender_repayment_receipt_policy',
    'signature_scheme_requested',
  ]);

  return changedFields.some(f => materialFields.has(f));
}
