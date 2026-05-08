import { describe, it, expect } from 'vitest';
import { getLoanOperationalState, type OperationalParams } from './loan-next-action';

const baseLoan = {
  id: 'l1',
  lender_id: 'L',
  borrower_id: 'B',
  amount: 10000,
  status: 'draft',
  repayment_date: '2099-01-01',
  // unused by helper but required by Loan type — we cast as any
} as any;

const ready = {
  lenderDisbursementReady: true,
  borrowerDisbursementReady: true,
  lenderRepaymentReady: true,
  borrowerRepaymentReady: true,
};
const notReady = {
  lenderDisbursementReady: false,
  borrowerDisbursementReady: false,
  lenderRepaymentReady: false,
  borrowerRepaymentReady: false,
};

const make = (over: Partial<OperationalParams>): OperationalParams => ({
  loan: baseLoan,
  userId: 'L',
  tranches: [],
  payments: [],
  bankReadiness: ready,
  signatures: [],
  latestAiChecks: [],
  ...over,
});

describe('getLoanOperationalState', () => {
  it('1. Draft lender → send', () => {
    const r = getLoanOperationalState(make({}));
    expect(r.nextAction.id).toBe('send_to_borrower');
    expect(r.nextAction.uiAction).toBe('open_send_modal');
  });

  it('2. Awaiting borrower signature, lender already signed → wait', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'signed_by_lender' } as any,
      signatures: [{ role: 'lender' }],
    }));
    expect(r.nextAction.id).toBe('wait_counterparty_signature');
  });

  it('3. Missing my requisites → choose', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'fully_signed' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
      bankReadiness: notReady,
    }));
    expect(r.nextAction.id).toBe('choose_my_bank_details');
  });

  it('4. Missing counterparty requisites → wait', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'fully_signed' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
      bankReadiness: { ...ready, borrowerDisbursementReady: false },
    }));
    expect(r.nextAction.id).toBe('wait_counterparty_bank_details');
  });

  it('5. Lender ready → make tranche', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'signed_no_debt' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
    }));
    expect(r.nextAction.id).toBe('create_tranche');
    expect(r.nextAction.uiAction).toBe('open_tranche_create_modal');
  });

  it('6. Borrower with pending tranche → confirm', () => {
    const r = getLoanOperationalState(make({
      userId: 'B',
      loan: { ...baseLoan, status: 'active' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
      tranches: [{ amount: 5000, status: 'sent', tranche_number: 1 }],
    }));
    expect(r.nextAction.id).toBe('confirm_tranche');
  });

  it('7. Active borrower outstanding → repay', () => {
    const r = getLoanOperationalState(make({
      userId: 'B',
      loan: { ...baseLoan, status: 'active' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
      tranches: [{ amount: 5000, status: 'confirmed', tranche_number: 1 }],
    }));
    expect(r.nextAction.id).toBe('repay_debt');
    expect(r.outstanding).toBe(5000);
  });

  it('8. Lender pending repayment → confirm', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'active' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
      tranches: [{ amount: 5000, status: 'confirmed', tranche_number: 1 }],
      payments: [{ transfer_amount: 1000, status: 'pending' }],
    }));
    expect(r.nextAction.id).toBe('confirm_repayment');
  });

  it('9. Overdue borrower → repay overdue', () => {
    const r = getLoanOperationalState(make({
      userId: 'B',
      loan: { ...baseLoan, status: 'active', repayment_date: '2020-01-01' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
      tranches: [{ amount: 5000, status: 'confirmed', tranche_number: 1 }],
    }));
    expect(r.nextAction.id).toBe('repay_overdue');
    expect(r.isOverdue).toBe(true);
    expect(r.statusKey).toBe('overdue');
    expect(r.tone).toBe('danger');
  });

  it('10. Repaid loan → full repayment doc', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'repaid' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
      tranches: [{ amount: 10000, status: 'confirmed', tranche_number: 1 }],
      payments: [{ transfer_amount: 10000, status: 'confirmed' }],
    }));
    expect(r.nextAction.id).toBe('generate_full_repayment');
  });

  it('11. AI BLOCKING → fix check', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'fully_signed' } as any,
      signatures: [{ role: 'lender' }, { role: 'borrower' }],
      latestAiChecks: [{ risk_level: 'BLOCKING', entity_type: 'tranche' }],
    }));
    expect(r.nextAction.id).toBe('fix_ai_check');
    expect(r.nextAction.uiAction).toBe('explain_ai_check');
  });

  it('12. Self-loan → blocked', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, lender_id: 'X', borrower_id: 'X' } as any,
      userId: 'X',
    }));
    expect(r.nextAction.priority).toBe('blocked');
    expect(r.nextAction.id).toBe('invalid_self_loan');
  });
});
