import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { X, Loader2, Banknote } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface CreateTrancheModalProps {
  loanId: string;
  userId: string;
  nextTrancheNumber: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateTrancheModal = ({
  loanId,
  userId,
  nextTrancheNumber,
  onClose,
  onSuccess,
}: CreateTrancheModalProps) => {
  const [amount, setAmount] = useState('');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('bank_transfer');
  const [senderDisplay, setSenderDisplay] = useState('');
  const [receiverDisplay, setReceiverDisplay] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [saving, setSaving] = useState(false);

  const inputClass = 'h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card';

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Укажите сумму транша');
      return;
    }
    if (!plannedDate) {
      toast.error('Укажите дату');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('loan_tranches').insert({
        loan_id: loanId,
        created_by: userId,
        tranche_number: nextTrancheNumber,
        amount: parseFloat(amount),
        planned_date: plannedDate,
        method,
        sender_account_display: senderDisplay.trim() || null,
        receiver_account_display: receiverDisplay.trim() || null,
        reference_text: referenceText.trim() || null,
        status: 'planned',
      });
      if (error) throw error;
      toast.success('Транш создан');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка создания транша');
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
              <Banknote className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">Новый транш</h3>
              <p className="text-xs text-muted-foreground">Транш № {nextTrancheNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Сумма (₽) *</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Планируемая дата *</Label>
            <Input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Способ перечисления</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Банковский перевод</SelectItem>
                <SelectItem value="sbp">СБП</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Счёт/реквизит отправителя</Label>
            <Input value={senderDisplay} onChange={e => setSenderDisplay(e.target.value)} placeholder="Номер карты / счёт" className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Счёт/реквизит получателя</Label>
            <Input value={receiverDisplay} onChange={e => setReceiverDisplay(e.target.value)} placeholder="Номер карты / счёт" className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Назначение платежа</Label>
            <Input value={referenceText} onChange={e => setReferenceText(e.target.value)} placeholder="По договору займа №..." className={inputClass} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Отмена</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl h-11 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              Создать
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
