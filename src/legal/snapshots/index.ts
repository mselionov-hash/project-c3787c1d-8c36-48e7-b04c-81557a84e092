/**
 * Snapshot creation logic for signing-time data freezing.
 * Will be implemented in Phase 2 when the signing_snapshots table is created.
 *
 * Snapshot types:
 * - contract_terms: full loan record at time of signing
 * - party_profile: signer's profile data (name, passport, address, phone)
 * - allowed_bank_details: resolved bank details allowed for this contract
 */

export const SNAPSHOT_TYPES = {
  CONTRACT_TERMS: 'contract_terms',
  PARTY_PROFILE: 'party_profile',
  ALLOWED_BANK_DETAILS: 'allowed_bank_details',
} as const;

export type SnapshotType = typeof SNAPSHOT_TYPES[keyof typeof SNAPSHOT_TYPES];
