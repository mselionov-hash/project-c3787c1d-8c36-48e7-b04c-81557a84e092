import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Tranche = Tables<'loan_tranches'>;

interface TrancheConfirmModalProps {
  tranche: Tranche;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const TrancheConfirmModal = ({ tranche, userId, onClose, onSuccess }: TrancheConfirmModalProps) => {
  const [actualDate, setActualDate] = useState(tranche.actual_date || new Date().toISOString().split('T')[0]);
  const [actualTime, setActualTime] = useState(tranche.actual_time || '');
  const [bankDocId, setBankDocId] = useState(tranche.bank_document_id || '');
  const [bankDocDate, setBankDocDate] = useState(tranche.bank_document_date || '');
  const [saving, setSaving] = useState(false);

  const inputClass = 'h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card';

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('loan_tranches')
        .update({
          status: 'confirmed',
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
          actual_date: actualDate || null,
          actual_time: actualTime || null,
          bank_document_id: bankDocId.trim() || null,
          bank_document_date: bankDocDate || null,
        })
        .eq('id', tranche.id);
      if (error) throw error;
      toast.success('Получение транша подтверждено');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка подтверждения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/15 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-md p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">Подтвердить получение</h3>
              <p className="text-xs text-muted-foreground">
                Транш № {tranche.tranche_number} — {Number(tranche.amount).toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Фактическая дата получения</Label>
            <Input type="date" value={actualDate} onChange={e => setActualDate(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Время получения</Label>
            <Input type="time" value={actualTime} onChange={e => setActualTime(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID банковского документа</Label>
            <Input value={bankDocId} onChange={e => setBankDocId(e.target.value)} placeholder="Номер платёжного поручения" className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата банковского документа</Label>
            <Input type="date" value={bankDocDate} onChange={e => setBankDocDate(e.target.value)} className={inputClass} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Отмена</Button>
            <Button onClick={handleConfirm} disabled={saving} className="flex-1 rounded-xl h-11 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Подтвердить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
