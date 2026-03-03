import { Loan } from '@/lib/types';
import { CalendarDays, Percent, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface LoanCardProps {
  loan: Loan;
  type: 'issued' | 'taken';
}

const LoanCard = ({ loan, type }: LoanCardProps) => {
  const isOverdue = new Date(loan.repaymentDate) < new Date() && loan.status === 'active';

  return (
    <div className="card-elevated p-6 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            type === 'issued' ? 'bg-accent/10 group-hover:bg-accent/15' : 'bg-primary/10 group-hover:bg-primary/15'
          }`}>
            {type === 'issued' 
              ? <ArrowUpRight className="w-5 h-5 text-accent" />
              : <ArrowDownLeft className="w-5 h-5 text-primary" />
            }
          </div>
          <div>
            <p className="font-semibold text-sm">
              {type === 'issued' ? loan.borrowerName : loan.lenderName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {type === 'issued' ? 'Заёмщик' : 'Займодавец'}
            </p>
          </div>
        </div>
        <span className={`pill-badge ${
          isOverdue 
            ? 'bg-destructive/10 text-destructive' 
            : 'bg-accent/10 text-accent'
        }`}>
          {isOverdue ? 'Просрочен' : 'Активный'}
        </span>
      </div>

      <div className="stat-value mb-1">
        {loan.amount.toLocaleString('ru-RU')} ₽
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
        <span className="flex items-center gap-1.5">
          <Percent className="w-3.5 h-3.5" />
          {loan.interestRate}% годовых
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          {new Date(loan.repaymentDate).toLocaleDateString('ru-RU')}
        </span>
      </div>

      {loan.notes && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
          {loan.notes}
        </p>
      )}
    </div>
  );
};

export default LoanCard;
