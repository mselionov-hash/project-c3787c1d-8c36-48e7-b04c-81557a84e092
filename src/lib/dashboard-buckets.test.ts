import { describe, it, expect } from 'vitest';
import { getLoanOperationalState, type BankReadiness } from './loan-next-action';

const LENDER = '11111111-1111-1111-1111-111111111111';
const BORROWER = '22222222-2222-2222-2222-222222222222';

const baseLoan = (overrides: any = {}) => ({
  id: 'l1', lender_id: LENDER, borrower_id: BORROWER,
  lender_name: 'L', borrower_name: 'B',
  amount: 10000, status: 'active',
  repayment_date: '2099-12-31', issue_date: '2026-01-01',
  interest_rate: 0, penalty_rate: 0.1, city: 'Москва',
  created_at: '2026-01-01', updated_at: '2026-01-01',
  contract_number: null, lender_passport: '', borrower_passport: '',
  lender_address: '', borrower_address: '', notes: '',
  disbursement_method: 'bank_transfer', interest_mode: 'interest_free',
  interest_payment_schedule: null, repayment_schedule_type: 'no_schedule_single_deadline',
  early_repayment_notice_days: 30, signature_scheme_requested: 'UKEP_ONLY',
  borrower_disbursement_receipt_policy: 'BANK_TRANSFER_ONLY',
  lender_repayment_receipt_policy: 'BANK_TRANSFER_ONLY',
  initiator_role: 'lender', deal_version: 1, loan_type: 'INDIVIDUAL_TO_INDIVIDUAL',
  interest_accrual_start: 'FROM_EACH_TRANCHE_DATE',
  early_repayment_interest_rule: 'ACCRUED_TO_DATE',
  archived_at: null, archived_by: null, archive_reason: null,
  ...overrides,
});
const allReady: BankReadiness = {
  lenderDisbursementReady: true, borrowerDisbursementReady: true,
  lenderRepaymentReady: true, borrowerRepaymentReady: true,
};
const sigs = [{ role: 'lender' as const }, { role: 'borrower' as const }];

describe('Dashboard bucketing via opState', () => {
  it('1. fully_signed + all ready + lender + no tranche → create_tranche (NOT awaitingRequisites)', () => {
    const op = getLoanOperationalState({
      loan: baseLoan({ status: 'fully_signed' }) as any, userId: LENDER,
      tranches: [], payments: [], signatures: sigs, bankReadiness: allReady,
    });
    expect(op.nextAction.id).toBe('create_tranche');
    expect(op.nextAction.priority).toBe('primary');
  });

  it('2. fully_signed + lender requisites missing → choose_my_bank_details', () => {
    const op = getLoanOperationalState({
      loan: baseLoan({ status: 'fully_signed' }) as any, userId: LENDER,
      tranches: [], payments: [], signatures: sigs,
      bankReadiness: { ...allReady, lenderDisbursementReady: false },
    });
    expect(op.nextAction.id).toBe('choose_my_bank_details');
  });

  it('3. fully_signed + my side ready + counterparty missing → wait_counterparty_bank_details', () => {
    const op = getLoanOperationalState({
      loan: baseLoan({ status: 'fully_signed' }) as any, userId: LENDER,
      tranches: [], payments: [], signatures: sigs,
      bankReadiness: { ...allReady, borrowerDisbursementReady: false },
    });
    expect(op.nextAction.id).toBe('wait_counterparty_bank_details');
    expect(op.nextAction.priority).toBe('info');
  });

  it('4. active + outstanding + borrower + disbursement ready (repayment OK) → repay_debt', () => {
    const op = getLoanOperationalState({
      loan: baseLoan({ status: 'active' }) as any, userId: BORROWER,
      tranches: [{ amount: 10000, status: 'confirmed', tranche_number: 1 }],
      payments: [], signatures: sigs, bankReadiness: allReady,
    });
    expect(op.nextAction.id).toBe('repay_debt');
  });

  it('5. active + all ready + borrower → repay_debt', () => {
    const op = getLoanOperationalState({
      loan: baseLoan({ status: 'active' }) as any, userId: BORROWER,
      tranches: [{ amount: 10000, status: 'confirmed', tranche_number: 1 }],
      payments: [], signatures: sigs, bankReadiness: allReady,
    });
    expect(op.nextAction.id).toBe('repay_debt');
    expect(op.isOverdue).toBe(false);
  });

  it('6. overdue + outstanding (borrower) → repay_overdue + isOverdue', () => {
    const op = getLoanOperationalState({
      loan: baseLoan({ status: 'active', repayment_date: '2020-01-01' }) as any, userId: BORROWER,
      tranches: [{ amount: 10000, status: 'confirmed', tranche_number: 1 }],
      payments: [], signatures: sigs, bankReadiness: allReady,
    });
    expect(op.isOverdue).toBe(true);
    expect(op.nextAction.id).toBe('repay_overdue');
  });

  it('7. repaid → generate_full_repayment', () => {
    const op = getLoanOperationalState({
      loan: baseLoan({ status: 'repaid' }) as any, userId: LENDER,
      tranches: [{ amount: 10000, status: 'confirmed', tranche_number: 1 }],
      payments: [{ transfer_amount: 10000, status: 'confirmed' }],
      signatures: sigs, bankReadiness: allReady,
    });
    expect(['generate_full_repayment', 'all_good']).toContain(op.nextAction.id);
  });
});
