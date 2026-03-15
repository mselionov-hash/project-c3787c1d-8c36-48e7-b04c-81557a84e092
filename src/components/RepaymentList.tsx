import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreditCard, Plus, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { CreateRepaymentModal } from '@/components/CreateRepaymentModal';
import type { Tables } from '@/integrations/supabase/types';

type Payment = Tables<'loan_payments'>;

interface RepaymentListProps {
  payments: Payment[];
  loanId: string;
  userId: string;
  isLender: boolean;
  isBorrower: boolean;
  loanStatus: string;
  onRefresh: () => void;
}

const PAYMENT_STATUS: Record<string, { label: string; class: string }> = {
  pending: { label: 'Ожидает', class: 'bg-warning/10 text-warning' },
  confirmed: { label: 'Подтверждён', class: 'bg-accent/10 text-accent' },
  rejected: { label: 'Отклонён', class: 'bg-destructive/10 text-destructive' },
};

export const RepaymentList = ({
  payments,
  loanId,
  userId,
  isLender,
  isBorrower,
  loanStatus,
  onRefresh,
}: RepaymentListProps) => {
  const [showCreate, setShowCreate] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const canCreate = isBorrower && ['active'].includes(loanStatus);
  const totalConfirmed = payments
    .filter(p => p.status === 'confirmed')
    .reduce((s, p) => s + Number(p.transfer_amount), 0);

  const handleConfirm = async (paymentId: string) => {
    setConfirming(paymentId);
    try {
      const { error } = await supabase
        .from('loan_payments')
        .update({
          status: 'confirmed',
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      if (error) throw error;
      toast.success('Погашение подтверждено');
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Погашения</h3>
            <p className="text-xs text-muted-foreground">
              {payments.length > 0
                ? `${payments.length} шт. • Подтверждено: ${totalConfirmed.toLocaleString('ru-RU')} ₽`
                : 'История платежей по займу'}
            </p>
          </div>
        </div>
        {canCreate && (
          <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Погашение
          </Button>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {loanStatus === 'active'
              ? 'Погашений пока нет'
              : 'Погашения появятся после выдачи первого транша'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => {
            const st = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.pending;
            const canConfirmThis = isLender && p.status === 'pending';

            return (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/40">
                <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
                  {p.status === 'confirmed'
                    ? <CheckCircle2 className="w-5 h-5 text-accent" />
                    : <Clock className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{Number(p.transfer_amount).toLocaleString('ru-RU')} ₽</p>
                    <span className={`pill-badge text-[10px] ${st.class}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.transfer_date).toLocaleDateString('ru-RU')}
                    {p.bank_name && ` • ${p.bank_name}`}
                    {p.transfer_method === 'sbp' ? ' • СБП' : ' • Перевод'}
                  </p>
                </div>
                {canConfirmThis && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs gap-1"
                    disabled={confirming === p.id}
                    onClick={() => handleConfirm(p.id)}
                  >
                    {confirming === p.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Подтвердить
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateRepaymentModal
          loanId={loanId}
          payerId={userId}
          onClose={() => setShowCreate(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
