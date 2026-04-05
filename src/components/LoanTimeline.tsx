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
  edoAccepted?: boolean;
}

export const LoanTimeline = ({ loan, signatures, tranches, payments, edoAccepted }: LoanTimelineProps) => {
  const confirmedTranches = tranches.filter(t => t.status === 'confirmed');
  const pendingTranches = tranches.filter(t => t.status === 'pending_confirmation');
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const pendingPayments = payments.filter(p => p.status === 'pending_confirmation');
  const totalDisbursed = confirmedTranches.reduce((s, t) => s + Number(t.amount), 0);
  const totalRepaid = confirmedPayments.reduce((s, p) => s + Number(p.transfer_amount), 0);
  const isUnep = loan.signature_scheme_requested === 'UNEP_WITH_APPENDIX_6';

  const events: TimelineEvent[] = [
    {
      label: 'Договор создан',
      date: new Date(loan.created_at).toLocaleDateString('ru-RU'),
      done: true,
    },
  ];

  // Sent to borrower
  if (loan.borrower_id) {
    events.push({
      label: 'Отправлен заёмщику',
      done: true,
    });
  } else if (loan.status === 'draft') {
    events.push({ label: 'Ожидание отправки заёмщику', done: false });
  }

  // EDO regulation (UNEP only)
  if (isUnep) {
    events.push({
      label: 'Регламент ЭДО принят',
      done: !!edoAccepted,
    });
  }

  // Signatures
  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');

  events.push({
    label: 'Подписан займодавцем',
    date: lenderSig?.signed_at
      ? new Date(lenderSig.signed_at).toLocaleDateString('ru-RU')
      : undefined,
    done: !!lenderSig,
  });

  events.push({
    label: 'Подписан заёмщиком',
    date: borrowerSig?.signed_at
      ? new Date(borrowerSig.signed_at).toLocaleDateString('ru-RU')
      : undefined,
    done: !!borrowerSig,
  });

  // Tranches
  if (confirmedTranches.length > 0) {
    events.push({
      label: `Выдано ${totalDisbursed.toLocaleString('ru-RU')} ₽ (${confirmedTranches.length} транш${confirmedTranches.length > 1 ? 'а' : ''})`,
      date: confirmedTranches[confirmedTranches.length - 1].actual_date
        ? new Date(confirmedTranches[confirmedTranches.length - 1].actual_date!).toLocaleDateString('ru-RU')
        : undefined,
      done: true,
    });
  } else if (pendingTranches.length > 0) {
    events.push({ label: 'Транш ожидает подтверждения', done: false });
  } else if (['fully_signed', 'active'].includes(loan.status)) {
    events.push({ label: 'Ожидание перевода средств', done: false });
  }

  // Repayments
  if (confirmedPayments.length > 0) {
    events.push({
      label: `Погашено ${totalRepaid.toLocaleString('ru-RU')} ₽`,
      done: true,
    });
  } else if (pendingPayments.length > 0) {
    events.push({ label: 'Платёж ожидает подтверждения', done: false });
  }

  // Full repayment
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
              <div className={`w-px flex-1 min-h-[20px] ${event.done ? 'bg-primary/30' : 'bg-border'}`} />
            )}
          </div>
          <div className="pb-3">
            <p className={`text-xs ${event.done ? 'text-foreground' : 'text-muted-foreground'}`}>
              {event.label}
            </p>
            {event.date && (
              <p className="text-[10px] text-muted-foreground">{event.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
