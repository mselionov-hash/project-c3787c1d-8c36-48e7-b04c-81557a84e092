import type { Tables } from '@/integrations/supabase/types';
import { parseDateOnly } from '@/lib/date-utils';

type Loan = Tables<'loans'>;
type Tranche = Tables<'loan_tranches'>;
type Payment = Tables<'loan_payments'>;

export interface LoanTotals {
  totalDisbursed: number;
  totalRepaid: number;
  outstanding: number;
  hasConfirmedDisbursement: boolean;
}

export function calculateLoanTotals(
  tranches: Pick<Tranche, 'amount' | 'status'>[],
  payments: Pick<Payment, 'transfer_amount' | 'status'>[]
): LoanTotals {
  const totalDisbursed = (tranches || [])
    .filter((t) => t.status === 'confirmed')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalRepaid = (payments || [])
    .filter((p) => p.status === 'confirmed')
    .reduce((s, p) => s + Number(p.transfer_amount || 0), 0);
  const outstanding = Math.max(0, totalDisbursed - totalRepaid);
  return {
    totalDisbursed,
    totalRepaid,
    outstanding,
    hasConfirmedDisbursement: totalDisbursed > 0,
  };
}

const NON_OVERDUE_STATUSES = new Set(['draft', 'repaid', 'cancelled']);

export function isLoanOverdue(
  loan: Pick<Loan, 'status' | 'repayment_date'>,
  tranches: Pick<Tranche, 'amount' | 'status'>[],
  payments: Pick<Payment, 'transfer_amount' | 'status'>[]
): boolean {
  if (!loan?.repayment_date) return false;
  if (NON_OVERDUE_STATUSES.has(loan.status)) return false;
  const totals = calculateLoanTotals(tranches, payments);
  if (!totals.hasConfirmedDisbursement) return false;
  if (totals.outstanding <= 0) return false;
  const due = parseDateOnly(loan.repayment_date).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today.getTime();
}

export function overdueDays(repaymentDate: string): number {
  const due = parseDateOnly(repaymentDate).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - due;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export type StatusTone = 'neutral' | 'warning' | 'danger' | 'success' | 'info';

export interface LoanDisplayStatus {
  statusKey: string;
  label: string;
  tone: StatusTone;
  isOverdue: boolean;
}

const RAW_STATUS_LABELS: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  awaiting_signatures: { label: 'Подписание', tone: 'warning' },
  signed_by_lender: { label: 'Ждёт заёмщика', tone: 'info' },
  signed_by_borrower: { label: 'Ждёт займодавца', tone: 'info' },
  fully_signed: { label: 'Подписан', tone: 'success' },
  signed_no_debt: { label: 'Нет долга', tone: 'success' },
  active: { label: 'Активный', tone: 'success' },
  repaid: { label: 'Погашён', tone: 'neutral' },
  overdue: { label: 'Просрочен', tone: 'danger' },
};

export function getLoanDisplayStatus(
  loan: Pick<Loan, 'status' | 'repayment_date'>,
  tranches: Pick<Tranche, 'amount' | 'status'>[],
  payments: Pick<Payment, 'transfer_amount' | 'status'>[]
): LoanDisplayStatus {
  const overdue = isLoanOverdue(loan, tranches, payments);
  if (overdue) {
    return { statusKey: 'overdue', label: 'Просрочен', tone: 'danger', isOverdue: true };
  }
  const raw = RAW_STATUS_LABELS[loan.status] || RAW_STATUS_LABELS.draft;
  return { statusKey: loan.status, label: raw.label, tone: raw.tone, isOverdue: false };
}
