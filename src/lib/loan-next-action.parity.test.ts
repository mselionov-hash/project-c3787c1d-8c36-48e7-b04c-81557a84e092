import { describe, it, expect } from 'vitest';
import { getLoanOperationalState, type OperationalParams } from './loan-next-action';

const baseLoan = {
  id: 'l1', lender_id: 'L', borrower_id: 'B', amount: 10000,
  status: 'fully_signed', repayment_date: '2099-01-01',
} as any;

const ready = {
  lenderDisbursementReady: true, borrowerDisbursementReady: true,
  lenderRepaymentReady: true, borrowerRepaymentReady: true,
};
const notReady = {
  lenderDisbursementReady: false, borrowerDisbursementReady: false,
  lenderRepaymentReady: false, borrowerRepaymentReady: false,
};
const sigsBoth = [{ role: 'lender' as const }, { role: 'borrower' as const }];

const make = (over: Partial<OperationalParams>): OperationalParams => ({
  loan: baseLoan, userId: 'L', tranches: [], payments: [],
  bankReadiness: ready, signatures: sigsBoth, latestAiChecks: [], ...over,
});

// Cross-surface parity: same input, expected same nextAction.label everywhere.
describe('cross-surface label parity', () => {
  it('1. missing requisites → "Выбрать реквизиты"', () => {
    const r = getLoanOperationalState(make({ bankReadiness: notReady }));
    expect(r.nextAction.label).toBe('Выбрать реквизиты');
  });

  it('2. lender can issue tranche → "Сделать транш"', () => {
    const r = getLoanOperationalState(make({ loan: { ...baseLoan, status: 'signed_no_debt' } }));
    expect(r.nextAction.label).toBe('Сделать транш');
  });

  it('3. borrower overdue → "Погасить задолженность"', () => {
    const r = getLoanOperationalState(make({
      userId: 'B',
      loan: { ...baseLoan, status: 'active', repayment_date: '2020-01-01' },
      tranches: [{ amount: 5000, status: 'confirmed', tranche_number: 1 }],
    }));
    expect(r.nextAction.label).toBe('Погасить задолженность');
  });

  it('4. pending repayment for lender → "Подтвердить погашение"', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'active' },
      tranches: [{ amount: 5000, status: 'confirmed', tranche_number: 1 }],
      payments: [{ transfer_amount: 1000, status: 'pending' }],
    }));
    expect(r.nextAction.label).toBe('Подтвердить погашение');
  });

  it('5. AI BLOCKING → "Загрузить корректный чек"', () => {
    const r = getLoanOperationalState(make({
      latestAiChecks: [{ risk_level: 'BLOCKING', entity_type: 'tranche' }],
    }));
    expect(r.nextAction.label).toBe('Загрузить корректный чек');
  });

  it('6. repaid loan → full repayment confirmation', () => {
    const r = getLoanOperationalState(make({
      loan: { ...baseLoan, status: 'repaid' },
      tranches: [{ amount: 10000, status: 'confirmed', tranche_number: 1 }],
      payments: [{ transfer_amount: 10000, status: 'confirmed' }],
    }));
    expect(r.nextAction.label).toBe('Сформировать подтверждение полного погашения');
    expect(r.nextAction.uiAction).toBe('open_documents');
  });
});
