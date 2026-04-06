import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { formatDateSafe, parseDateOnly } from '@/lib/date-utils';

type Loan = Tables<'loans'>;

const statusLabels: Record<string, { label: string; class: string }> = {
  draft: { label: 'Черновик', class: 'bg-muted text-muted-foreground' },
  awaiting_signatures: { label: 'Подписание', class: 'bg-warning/15 text-warning' },
  signed_by_lender: { label: 'Ждёт заёмщика', class: 'bg-info/15 text-info' },
  signed_by_borrower: { label: 'Ждёт займодавца', class: 'bg-info/15 text-info' },
  fully_signed: { label: 'Подписан', class: 'bg-primary/15 text-primary' },
  signed_no_debt: { label: 'Нет долга', class: 'bg-primary/15 text-primary' },
  active: { label: 'Активный', class: 'bg-primary/15 text-primary' },
  repaid: { label: 'Погашён', class: 'bg-muted text-muted-foreground' },
  overdue: { label: 'Просрочен', class: 'bg-destructive/15 text-destructive' },
};

interface NextStep {
  label: string;
  urgent?: boolean;
}

function getNextStep(loan: Loan, isLender: boolean): NextStep | null {
  switch (loan.status) {
    case 'draft':
      return isLender ? { label: 'Отправить заёмщику' } : null;
    case 'awaiting_signatures':
      return { label: 'Подписать договор', urgent: true };
    case 'signed_by_lender':
      return isLender ? null : { label: 'Подписать договор', urgent: true };
    case 'signed_by_borrower':
      return isLender ? { label: 'Подписать договор', urgent: true } : null;
    case 'fully_signed':
    case 'signed_no_debt':
      return isLender ? { label: 'Выдать транш' } : null;
    case 'active':
      return isLender ? null : { label: 'Погасить' };
    default:
      return null;
  }
}

export const LoanCard = ({ loan, type }: { loan: Loan; type: 'issued' | 'taken' }) => {
  const navigate = useNavigate();
  const status = statusLabels[loan.status] || statusLabels.draft;
  const isLender = type === 'issued';
  const nextStep = getNextStep(loan, isLender);
  const daysLeft = Math.ceil(
    (parseDateOnly(loan.repayment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={() => navigate(`/loans/${loan.id}`)}
      className="card-elevated p-4 hover:border-border transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          type === 'issued' ? 'bg-primary/10' : 'bg-info/10'
        }`}>
          {type === 'issued'
            ? <ArrowUpRight className="w-5 h-5 text-primary" />
            : <ArrowDownLeft className="w-5 h-5 text-info" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-sm truncate">
              {type === 'issued' ? loan.borrower_name : loan.lender_name}
            </p>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold font-display">
              {Number(loan.amount).toLocaleString('ru-RU')} ₽
            </span>
            <span className={`pill-badge ${status.class}`}>{status.label}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {loan.interest_mode === 'fixed_rate' && (
              <span>{Number(loan.interest_rate)}%</span>
            )}
            <span>до {formatDateSafe(loan.repayment_date, { day: 'numeric', month: 'short' })}</span>
            {daysLeft > 0 && daysLeft <= 30 && loan.status === 'active' && (
              <span className="text-warning">{daysLeft} дн.</span>
            )}
          </div>
          {nextStep && (
            <div className={`mt-2 text-xs font-medium ${nextStep.urgent ? 'text-warning' : 'text-primary'}`}>
              → {nextStep.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
