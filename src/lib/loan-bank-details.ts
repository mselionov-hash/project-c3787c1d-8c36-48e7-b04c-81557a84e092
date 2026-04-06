import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type BankDetail = Tables<'bank_details'>;
type AllowedLink = Tables<'loan_allowed_bank_details'>;

interface SnapshotBankDetail {
  bank_detail_id: string;
  bank_name: string;
  card_number: string | null;
  phone: string | null;
  account_number: string | null;
  bik: string | null;
  recipient_display_name: string | null;
  purpose: string;
  party_role: string;
}

export interface LoanBoundBankDetail extends BankDetail {
  bank_detail_id: AllowedLink['bank_detail_id'];
  party_role: AllowedLink['party_role'];
  purpose: AllowedLink['purpose'];
}

const hasText = (value: string | null | undefined): boolean => Boolean(value?.trim());

export function supportsBankTransfer(detail: Pick<BankDetail, 'account_number' | 'card_number'>): boolean {
  return hasText(detail.account_number) || hasText(detail.card_number);
}

export function supportsSbp(detail: Pick<BankDetail, 'phone'>): boolean {
  return hasText(detail.phone);
}

export function supportsReceiptPolicy(
  detail: Pick<BankDetail, 'account_number' | 'card_number' | 'phone'>,
  policy: string,
): boolean {
  switch (policy) {
    case 'BANK_TRANSFER_ONLY':
      return supportsBankTransfer(detail);
    case 'SBP_ONLY':
      return supportsSbp(detail);
    case 'BANK_TRANSFER_OR_SBP':
      return supportsBankTransfer(detail) || supportsSbp(detail);
    default:
      return supportsBankTransfer(detail) || supportsSbp(detail);
  }
}

export function isCompatibleLoanBoundBankDetail(loan: Loan, detail: LoanBoundBankDetail): boolean {
  if (detail.party_role === 'borrower' && detail.purpose === 'disbursement') {
    return supportsReceiptPolicy(detail, loan.borrower_disbursement_receipt_policy);
  }

  if (detail.party_role === 'lender' && detail.purpose === 'repayment') {
    return supportsReceiptPolicy(detail, loan.lender_repayment_receipt_policy);
  }

  return supportsBankTransfer(detail) || supportsSbp(detail);
}

export function filterCompatibleLoanBoundBankDetails(
  loan: Loan,
  details: LoanBoundBankDetail[],
  partyRole: string,
  purpose: string,
): LoanBoundBankDetail[] {
  return details.filter(detail => (
    detail.party_role === partyRole
    && detail.purpose === purpose
    && isCompatibleLoanBoundBankDetail(loan, detail)
  ));
}

export function formatLoanBoundBankLabel(detail: Pick<LoanBoundBankDetail, 'bank_name' | 'card_number' | 'phone' | 'account_number' | 'label'>): string {
  const parts = [detail.bank_name];

  if (hasText(detail.card_number)) parts.push(`•••• ${detail.card_number!.slice(-4)}`);
  else if (hasText(detail.account_number)) parts.push(`р/с •••${detail.account_number!.slice(-4)}`);
  else if (hasText(detail.phone)) parts.push(detail.phone!);

  if (hasText(detail.label)) parts.push(`(${detail.label})`);

  return parts.filter(Boolean).join(' ');
}

export function formatPrintableBankDetail(detail: Pick<LoanBoundBankDetail, 'bank_name' | 'recipient_display_name' | 'account_number' | 'card_number' | 'phone' | 'bik'>): string {
  const parts = [detail.bank_name];

  if (hasText(detail.recipient_display_name)) parts.push(`получатель ${detail.recipient_display_name}`);
  if (hasText(detail.account_number)) parts.push(`счет ${detail.account_number}`);
  else if (hasText(detail.card_number)) parts.push(`карта ${detail.card_number}`);
  if (hasText(detail.phone)) parts.push(`СБП ${detail.phone}`);
  if (hasText(detail.bik)) parts.push(`БИК ${detail.bik}`);

  return parts.filter(Boolean).join(', ');
}

export function getLoanBankReadiness(loan: Loan, details: LoanBoundBankDetail[]) {
  const lenderDisbursement = filterCompatibleLoanBoundBankDetails(loan, details, 'lender', 'disbursement');
  const borrowerDisbursement = filterCompatibleLoanBoundBankDetails(loan, details, 'borrower', 'disbursement');
  const lenderRepayment = filterCompatibleLoanBoundBankDetails(loan, details, 'lender', 'repayment');

  const missingMessages: string[] = [];

  if (lenderDisbursement.length === 0) {
    missingMessages.push('Не выбран допустимый реквизит займодавца для перечисления транша.');
  }

  if (borrowerDisbursement.length === 0) {
    missingMessages.push('Не выбран допустимый реквизит заёмщика для получения транша.');
  }

  if (lenderRepayment.length === 0) {
    missingMessages.push('Не выбран допустимый реквизит займодавца для получения возврата.');
  }

  // Per-side readiness: lender needs disbursement + repayment details, borrower needs disbursement details
  const lenderSideReady = lenderDisbursement.length > 0 && lenderRepayment.length > 0;
  const borrowerSideReady = borrowerDisbursement.length > 0;

  return {
    lenderDisbursement,
    borrowerDisbursement,
    lenderRepayment,
    trancheReady: lenderDisbursement.length > 0 && borrowerDisbursement.length > 0,
    repaymentReady: lenderRepayment.length > 0,
    allRequiredReady: missingMessages.length === 0,
    lenderSideReady,
    borrowerSideReady,
    missingMessages,
  };
}

export function requireSingleCompatibleBankDetail(
  loan: Loan,
  details: LoanBoundBankDetail[],
  partyRole: string,
  purpose: string,
  missingMessage: string,
  ambiguousMessage: string,
): LoanBoundBankDetail {
  const matches = filterCompatibleLoanBoundBankDetails(loan, details, partyRole, purpose);

  if (matches.length === 0) throw new Error(missingMessage);
  if (matches.length > 1) throw new Error(ambiguousMessage);

  return matches[0];
}

export function normalizeSnapshotAllowedBankDetails(snapshotDetails?: SnapshotBankDetail[]): LoanBoundBankDetail[] {
  return (snapshotDetails || []).map(detail => ({
    id: detail.bank_detail_id,
    bank_detail_id: detail.bank_detail_id,
    party_role: detail.party_role,
    purpose: detail.purpose,
    user_id: '',
    label: '',
    bank_name: detail.bank_name || '',
    detail_type: supportsSbp(detail) && !supportsBankTransfer(detail) ? 'sbp' : 'general',
    transfer_link: null,
    qr_image_url: null,
    recipient_display_name: detail.recipient_display_name,
    card_number: detail.card_number,
    phone: detail.phone,
    account_number: detail.account_number,
    bik: detail.bik,
    is_default: false,
    created_at: '',
    updated_at: '',
  }));
}

export async function fetchCurrentAllowedBankDetails(loanId: string): Promise<LoanBoundBankDetail[]> {
  const { data: allowedData, error: allowedError } = await supabase
    .from('loan_allowed_bank_details')
    .select('*')
    .eq('loan_id', loanId)
    .order('created_at', { ascending: true });

  if (allowedError) throw allowedError;
  if (!allowedData || allowedData.length === 0) return [];

  const bankIds = [...new Set(allowedData.map(item => item.bank_detail_id))];
  const { data: bankData, error: bankError } = await supabase
    .from('bank_details')
    .select('*')
    .in('id', bankIds);

  if (bankError) throw bankError;

  const bankMap = new Map((bankData || []).map(detail => [detail.id, detail]));

  return allowedData.flatMap(item => {
    const detail = bankMap.get(item.bank_detail_id);
    return detail ? [{ ...detail, bank_detail_id: item.bank_detail_id, party_role: item.party_role, purpose: item.purpose }] : [];
  });
}

export async function loadActiveAllowedBankDetails(
  loanId: string,
  snapshotDetails?: SnapshotBankDetail[],
): Promise<LoanBoundBankDetail[]> {
  const snapshotBound = normalizeSnapshotAllowedBankDetails(snapshotDetails);
  if (snapshotBound.length > 0) return snapshotBound;
  return fetchCurrentAllowedBankDetails(loanId);
}