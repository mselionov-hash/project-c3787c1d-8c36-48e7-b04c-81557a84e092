import { describe, it, expect } from 'vitest';
import { calculateLoanTotals, isLoanOverdue, getLoanDisplayStatus, overdueDays } from './loan-status';

const past = '2020-01-01';
const future = '2099-01-01';

const trCfm = (a: number) => ({ amount: a, status: 'confirmed' as const });
const pmCfm = (a: number) => ({ transfer_amount: a, status: 'confirmed' as const });

describe('loan-status', () => {
  it('totals & outstanding clamped at 0', () => {
    const r = calculateLoanTotals([trCfm(1000)], [pmCfm(2000)]);
    expect(r.outstanding).toBe(0);
    expect(r.totalDisbursed).toBe(1000);
  });
  it('active+past+outstanding -> overdue', () => {
    expect(isLoanOverdue({ status: 'active', repayment_date: past }, [trCfm(1000)], [])).toBe(true);
  });
  it('active+future -> not overdue', () => {
    expect(isLoanOverdue({ status: 'active', repayment_date: future }, [trCfm(1000)], [])).toBe(false);
  });
  it('repaid+past -> not overdue', () => {
    expect(isLoanOverdue({ status: 'repaid', repayment_date: past }, [trCfm(1000)], [pmCfm(1000)])).toBe(false);
  });
  it('no confirmed tranche -> not overdue', () => {
    expect(isLoanOverdue({ status: 'active', repayment_date: past }, [], [])).toBe(false);
  });
  it('draft -> not overdue', () => {
    expect(isLoanOverdue({ status: 'draft', repayment_date: past }, [trCfm(1000)], [])).toBe(false);
  });
  it('display status overdue label/tone', () => {
    const d = getLoanDisplayStatus({ status: 'active', repayment_date: past }, [trCfm(500)], []);
    expect(d.isOverdue).toBe(true);
    expect(d.label).toBe('Просрочен');
    expect(d.tone).toBe('danger');
  });
  it('overdueDays > 0', () => {
    expect(overdueDays(past)).toBeGreaterThan(0);
  });
});
