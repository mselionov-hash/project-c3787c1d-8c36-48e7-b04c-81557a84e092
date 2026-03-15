/**
 * Snapshot creation logic for signing-time data freezing.
 * Creates immutable JSONB snapshots in the signing_snapshots table.
 */

import { supabase } from '@/integrations/supabase/client';

export const SNAPSHOT_TYPES = {
  CONTRACT_TERMS: 'contract_terms',
  PARTY_PROFILE: 'party_profile',
  ALLOWED_BANK_DETAILS: 'allowed_bank_details',
} as const;

export type SnapshotType = typeof SNAPSHOT_TYPES[keyof typeof SNAPSHOT_TYPES];

export interface ContractTermsSnapshot {
  loan_id: string;
  contract_number: string | null;
  amount: number;
  interest_rate: number;
  interest_mode: string;
  interest_payment_schedule: string | null;
  penalty_rate: number;
  repayment_date: string;
  repayment_schedule_type: string;
  issue_date: string;
  city: string;
  early_repayment_notice_days: number;
  lender_name: string;
  borrower_name: string;
  lender_passport: string | null;
  borrower_passport: string | null;
  lender_address: string | null;
  borrower_address: string | null;
}

export interface PartyProfileSnapshot {
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  passport_series: string | null;
  passport_number: string | null;
  passport_issued_by: string | null;
  passport_issue_date: string | null;
  passport_division_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface BankDetailSnapshot {
  bank_detail_id: string;
  bank_name: string;
  card_number: string | null;
  phone: string | null;
  account_number: string | null;
  bik: string | null;
  transfer_link: string | null;
  recipient_display_name: string | null;
  purpose: string;
  party_role: string;
}

export interface AllowedBankDetailsSnapshot {
  loan_id: string;
  details: BankDetailSnapshot[];
}

export async function createSnapshot(
  loanId: string,
  snapshotType: SnapshotType,
  signerId: string,
  role: string,
  snapshotData: ContractTermsSnapshot | PartyProfileSnapshot | AllowedBankDetailsSnapshot
): Promise<string> {
  const row = {
    loan_id: loanId,
    snapshot_type: snapshotType,
    signer_id: signerId,
    role,
    snapshot_data: JSON.parse(JSON.stringify(snapshotData)),
  };

  const { data, error } = await supabase
    .from('signing_snapshots')
    .insert(row)
    .select('id')
    .single();

  if (error) throw new Error(`Snapshot creation failed: ${error.message}`);
  return data.id;
}

export async function getSnapshots(loanId: string, snapshotType?: SnapshotType) {
  let query = supabase
    .from('signing_snapshots')
    .select('*')
    .eq('loan_id', loanId)
    .order('created_at', { ascending: true });

  if (snapshotType) {
    query = query.eq('snapshot_type', snapshotType);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Snapshot fetch failed: ${error.message}`);
  return data;
}
