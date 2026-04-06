import { useState } from 'react';
import { formatDateSafe } from '@/lib/date-utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ListChecks, Plus, Loader2, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type ScheduleItem = Tables<'payment_schedule_items'>;

interface PaymentScheduleProps {
  items: ScheduleItem[];
  loanId: string;
  isLender: boolean;
  loanStatus: string;
  repaymentScheduleType: string;
  onRefresh: () => void;
}

export const PaymentSchedule = ({
  items,
  loanId,
  isLender,
  loanStatus,
  repaymentScheduleType,
  onRefresh,
}: PaymentScheduleProps) => {
  const [showForm, setShowForm] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const hasSchedule = repaymentScheduleType !== 'no_schedule_single_deadline';
  const canEdit = isLender && ['draft', 'fully_signed', 'active'].includes(loanStatus);
  const nextNumber = items.length > 0 ? Math.max(...items.map(i => i.item_number)) + 1 : 1;

  const inputClass = 'h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card';

  const handleAdd = async () => {
    if (!dueDate) {
      toast.error('Укажите дату платежа');
      return;
    }
    const principal = parseFloat(principalAmount) || 0;
    const interest = parseFloat(interestAmount) || 0;
    if (principal + interest <= 0) {
      toast.error('Укажите сумму');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('payment_schedule_items').insert({
        loan_id: loanId,
        item_number: nextNumber,
        due_date: dueDate,
        principal_amount: principal,
        interest_amount: interest,
        total_amount: principal + interest,
      });
      if (error) throw error;
      toast.success('Платёж добавлен в график');
      setDueDate('');
      setPrincipalAmount('');
      setInterestAmount('');
      setShowForm(false);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">График погашения</h3>
            <p className="text-xs text-muted-foreground">Приложение 2 к договору</p>
          </div>
        </div>
        {hasSchedule && canEdit && !showForm && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Платёж
          </Button>
        )}
      </div>

      {!hasSchedule ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Единый срок возврата — график не требуется</p>
        </div>
      ) : items.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">График погашения пуст</p>
          {canEdit && (
            <Button size="sm" variant="outline" className="mt-3 rounded-xl gap-1.5 text-xs" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
              Добавить первый платёж
            </Button>
          )}
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">№</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Основной долг</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Проценты</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Итого</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-border/20">
                      <td className="py-2.5 px-3">{item.item_number}</td>
                      <td className="py-2.5 px-3">{formatDateSafe(item.due_date)}</td>
                      <td className="py-2.5 px-3 text-right">{Number(item.principal_amount).toLocaleString('ru-RU')} ₽</td>
                      <td className="py-2.5 px-3 text-right">{Number(item.interest_amount).toLocaleString('ru-RU')} ₽</td>
                      <td className="py-2.5 px-3 text-right font-medium">{Number(item.total_amount).toLocaleString('ru-RU')} ₽</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`pill-badge text-[10px] ${
                          item.status === 'paid' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.status === 'paid' ? 'Оплачен' : 'Ожидает'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="mt-4 p-4 rounded-xl border border-border/40 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Платёж № {nextNumber}</h4>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Дата *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Основной долг</Label>
              <Input type="number" min="0" step="0.01" value={principalAmount} onChange={e => setPrincipalAmount(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Проценты</Label>
              <Input type="number" min="0" step="0.01" value={interestAmount} onChange={e => setInterestAmount(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl h-10 text-xs">Отмена</Button>
            <Button onClick={handleAdd} disabled={saving} className="flex-1 rounded-xl h-10 text-xs gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Добавить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
