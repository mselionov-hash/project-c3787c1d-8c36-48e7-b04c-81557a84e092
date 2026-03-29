import { CheckCircle2, Circle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type Signature = Tables<'loan_signatures'>;
type Tranche = Tables<'loan_tranches'>;
type Payment = Tables<'loan_payments'>;

interface TimelineEvent {
  label: string;
  date?: string;
  done: boolean;
}

interface LoanTimelineProps {
  loan: Loan;
  signatures: Signature[];
  tranches: Tranche[];
  payments: Payment[];
}

export const LoanTimeline = ({ loan, signatures, tranches, payments }: LoanTimelineProps) => {
  const confirmedTranches = tranches.filter(t => t.status === 'confirmed');
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalDisbursed = confirmedTranches.reduce((s, t) => s + Number(t.amount), 0);
  const totalRepaid = confirmedPayments.reduce((s, p) => s + Number(p.transfer_amount), 0);

  const events: TimelineEvent[] = [
    {
      label: 'Договор создан',
      date: new Date(loan.created_at).toLocaleDateString('ru-RU'),
      done: true,
    },
    {
      label: 'Подписан займодавцем',
      date: signatures.find(s => s.role === 'lender')?.signed_at
        ? new Date(signatures.find(s => s.role === 'lender')!.signed_at).toLocaleDateString('ru-RU')
        : undefined,
      done: !!signatures.find(s => s.role === 'lender'),
    },
    {
      label: 'Подписан заёмщиком',
      date: signatures.find(s => s.role === 'borrower')?.signed_at
        ? new Date(signatures.find(s => s.role === 'borrower')!.signed_at).toLocaleDateString('ru-RU')
        : undefined,
      done: !!signatures.find(s => s.role === 'borrower'),
    },
  ];

  if (confirmedTranches.length > 0) {
    events.push({
      label: `Выдано ${totalDisbursed.toLocaleString('ru-RU')} ₽ (${confirmedTranches.length} транш)`,
      date: confirmedTranches[confirmedTranches.length - 1].actual_date
        ? new Date(confirmedTranches[confirmedTranches.length - 1].actual_date!).toLocaleDateString('ru-RU')
        : undefined,
      done: true,
    });
  } else if (['fully_signed', 'active'].includes(loan.status)) {
    events.push({ label: 'Ожидание перевода средств', done: false });
  }

  if (confirmedPayments.length > 0) {
    events.push({
      label: `Погашено ${totalRepaid.toLocaleString('ru-RU')} ₽`,
      done: true,
    });
  }

  if (loan.status === 'repaid') {
    events.push({ label: 'Займ полностью погашён', done: true });
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            {event.done ? (
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            {i < events.length - 1 && (
              <div className={`w-px flex-1 min-h-[24px] ${event.done ? 'bg-primary/30' : 'bg-border'}`} />
            )}
          </div>
          <div className="pb-4">
            <p className={`text-sm ${event.done ? 'text-foreground' : 'text-muted-foreground'}`}>
              {event.label}
            </p>
            {event.date && (
              <p className="text-xs text-muted-foreground">{event.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
