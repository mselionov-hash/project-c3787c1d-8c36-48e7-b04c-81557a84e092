import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Banknote, X, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  loanId: string;
  loanAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal = ({ loanId, loanAmount, onClose, onSuccess }: PaymentModalProps) => {
  const { user } = useAuth();
  const [method, setMethod] = useState('bank_transfer');
  const [amount, setAmount] = useState(loanAmount.toString());
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const { error } = await supabase.from('loan_payments').insert({
        loan_id: loanId,
        payer_id: user.id,
        transfer_method: method,
        transfer_amount: parseFloat(amount),
        bank_name: bankName.trim(),
        payment_reference: reference.trim(),
        transaction_id: transactionId,
        status: 'confirmed',
      });
      if (error) throw error;

      // Update loan status
      await supabase.from('loans').update({ status: 'active' }).eq('id', loanId);

      toast.success(`Платёж подтверждён! ID: ${transactionId}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка при оплате');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card";

  return (
    <div className="fixed inset-0 bg-foreground/15 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-md p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">Отправить деньги</h3>
              <p className="text-xs text-muted-foreground">Симуляция перевода</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Способ перевода</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Банковский перевод</SelectItem>
                <SelectItem value="sbp">СБП</SelectItem>
                <SelectItem value="cash">Наличные</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Сумма (₽)</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Банк</Label>
            <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Сбербанк, Тинькофф..." className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Назначение платежа</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Перевод по договору займа" className={inputClass} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl gap-2 text-sm font-semibold">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
            Подтвердить перевод
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
