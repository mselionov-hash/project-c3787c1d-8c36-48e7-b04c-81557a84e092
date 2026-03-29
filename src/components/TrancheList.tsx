import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Banknote, Plus, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { CreateTrancheModal } from '@/components/CreateTrancheModal';
import { TrancheConfirmModal } from '@/components/TrancheConfirmModal';
import type { Tables } from '@/integrations/supabase/types';

type Tranche = Tables<'loan_tranches'>;

interface TrancheListProps {
  tranches: Tranche[];
  loanId: string;
  userId: string;
  lenderId: string;
  borrowerId: string | null;
  isLender: boolean;
  isBorrower: boolean;
  loanStatus: string;
  onRefresh: () => void;
  onGenerateReceipt?: (trancheId: string) => void;
}

const TRANCHE_STATUS: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  planned: { label: 'Запланирован', icon: Clock, class: 'bg-muted text-muted-foreground' },
  sent: { label: 'Отправлен', icon: AlertCircle, class: 'bg-warning/10 text-warning' },
  confirmed: { label: 'Подтверждён', icon: CheckCircle2, class: 'bg-accent/10 text-accent' },
};

export const TrancheList = ({
  tranches,
  loanId,
  userId,
  lenderId,
  borrowerId,
  isLender,
  isBorrower,
  loanStatus,
  onRefresh,
  onGenerateReceipt,
}: TrancheListProps) => {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmTranche, setConfirmTranche] = useState<Tranche | null>(null);

  const canCreateTranche = isLender && ['fully_signed', 'active'].includes(loanStatus);
  const nextNumber = tranches.length > 0 ? Math.max(...tranches.map(t => t.tranche_number)) + 1 : 1;
  const totalConfirmed = tranches
    .filter(t => t.status === 'confirmed')
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Транши</h3>
            <p className="text-xs text-muted-foreground">
              {tranches.length > 0
                ? `${tranches.length} шт. • Подтверждено: ${totalConfirmed.toLocaleString('ru-RU')} ₽`
                : 'Выданные средства по договору'}
            </p>
          </div>
        </div>
        {canCreateTranche && (
          <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Транш
          </Button>
        )}
      </div>

      {tranches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {['fully_signed', 'active'].includes(loanStatus)
              ? 'Создайте первый транш для перечисления средств'
              : 'Транши появятся после подписания договора'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tranches.map(t => {
            const st = TRANCHE_STATUS[t.status] || TRANCHE_STATUS.planned;
            const StIcon = st.icon;
            const canConfirm = isBorrower && (t.status === 'planned' || t.status === 'sent');

            return (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/40">
                <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
                  <StIcon className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">Транш № {t.tranche_number}</p>
                    <span className={`pill-badge text-[10px] ${st.class}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Number(t.amount).toLocaleString('ru-RU')} ₽
                    {t.actual_date ? ` • ${new Date(t.actual_date).toLocaleDateString('ru-RU')}` : ` • план: ${new Date(t.planned_date).toLocaleDateString('ru-RU')}`}
                    {t.method === 'sbp' ? ' • СБП' : ' • Перевод'}
                  </p>
                </div>
                {canConfirm && (
                  <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1" onClick={() => setConfirmTranche(t)}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Подтвердить
                  </Button>
                )}
                {t.status === 'confirmed' && onGenerateReceipt && (
                  <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1" onClick={() => onGenerateReceipt(t.id)}>
                    <FileText className="w-3.5 h-3.5" />
                    Расписка
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateTrancheModal
          loanId={loanId}
          userId={userId}
          lenderId={lenderId}
          borrowerId={borrowerId}
          nextTrancheNumber={nextNumber}
          onClose={() => setShowCreate(false)}
          onSuccess={onRefresh}
        />
      )}

      {confirmTranche && (
        <TrancheConfirmModal
          tranche={confirmTranche}
          userId={userId}
          onClose={() => setConfirmTranche(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
