/**
 * Receipt policy label mappers for TZ v2.2.
 * Maps canonical receipt policy codes to Russian display text.
 */

import { RECEIPT_POLICY, type ReceiptPolicy } from '../variables';

const RECEIPT_POLICY_LABELS: Record<string, string> = {
  [RECEIPT_POLICY.BANK_TRANSFER_ONLY]: 'только банковский перевод',
  [RECEIPT_POLICY.SBP_ONLY]: 'только СБП',
  [RECEIPT_POLICY.BANK_TRANSFER_OR_SBP]: 'банковский перевод или СБП',
};

/**
 * Get Russian label for a receipt policy.
 */
export function getReceiptPolicyLabel(policy: string): string {
  return RECEIPT_POLICY_LABELS[policy] ?? policy;
}

/**
 * Get all available receipt policy options for UI selects.
 */
export function getReceiptPolicyOptions(): Array<{ value: ReceiptPolicy; label: string }> {
  return [
    { value: RECEIPT_POLICY.BANK_TRANSFER_ONLY, label: 'Только банковский перевод' },
    { value: RECEIPT_POLICY.SBP_ONLY, label: 'Только СБП' },
    { value: RECEIPT_POLICY.BANK_TRANSFER_OR_SBP, label: 'Банковский перевод или СБП' },
  ];
}
