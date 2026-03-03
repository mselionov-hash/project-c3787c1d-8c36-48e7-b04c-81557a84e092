import { Loan } from '@/lib/types';
import { CalendarDays, Percent, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface LoanCardProps {
  loan: Loan;
  type: 'issued' | 'taken';
}

const LoanCard = ({ loan, type }: LoanCardProps) => {
  const isOverdue = new Date(loan.repaymentDate) < new Date() && loan.status === 'active';

  return (
    <div className="card-glass p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            type === 'issued' ? 'bg-accent/10' : 'bg-primary/10'
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
            <p className="text-xs text-muted-foreground">
              {type === 'issued' ? 'Заёмщик' : 'Займодавец'}
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
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

      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
        <span className="flex items-center gap-1">
          <Percent className="w-3.5 h-3.5" />
          {loan.interestRate}% годовых
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {new Date(loan.repaymentDate).toLocaleDateString('ru-RU')}
        </span>
      </div>

      {loan.notes && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2 border-t border-border pt-3">
          {loan.notes}
        </p>
      )}
    </div>
  );
};

export default LoanCard;
