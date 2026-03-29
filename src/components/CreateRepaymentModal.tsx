import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { X, Loader2, ArrowDownLeft } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Tables } from '@/integrations/supabase/types';

type BankDetail = Tables<'bank_details'>;

interface CreateRepaymentModalProps {
  loanId: string;
  payerId: string;
  lenderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const formatBankLabel = (bd: BankDetail) => {
  const parts = [bd.bank_name];
  if (bd.card_number) parts.push(`•••• ${bd.card_number.slice(-4)}`);
  else if (bd.phone) parts.push(bd.phone);
  else if (bd.account_number) parts.push(`р/с •••${bd.account_number.slice(-4)}`);
  if (bd.label) parts.push(`(${bd.label})`);
  return parts.join(' ');
};

export const CreateRepaymentModal = ({
  loanId,
  payerId,
  lenderId,
  onClose,
  onSuccess,
}: CreateRepaymentModalProps) => {
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferMethod, setTransferMethod] = useState('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);

  const [payerBankDetails, setPayerBankDetails] = useState<BankDetail[]>([]);
  const [lenderBankDetails, setLenderBankDetails] = useState<BankDetail[]>([]);
  const [selectedPayerBdId, setSelectedPayerBdId] = useState<string>('');
  const [selectedLenderBdId, setSelectedLenderBdId] = useState<string>('');

  const inputClass = 'h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card';

  useEffect(() => {
    const fetchBankDetails = async () => {
      // Borrower's (payer) bank details
      const { data: payerData } = await supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', payerId);

      const payerList = payerData || [];
      setPayerBankDetails(payerList);

      const defaultPayer = payerList.find(b => b.is_default) || (payerList.length === 1 ? payerList[0] : null);
      if (defaultPayer) {
        setSelectedPayerBdId(defaultPayer.id);
        setBankName(defaultPayer.bank_name);
      }

      // Lender's bank details (where to send repayment)
      const { data: lenderData } = await supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', lenderId);

      const lenderList = lenderData || [];
      setLenderBankDetails(lenderList);

      const defaultLender = lenderList.find(b => b.is_default) || (lenderList.length === 1 ? lenderList[0] : null);
      if (defaultLender) {
        setSelectedLenderBdId(defaultLender.id);
      }
    };
    fetchBankDetails();
  }, [payerId, lenderId]);

  const handlePayerSelect = (bdId: string) => {
    setSelectedPayerBdId(bdId);
    const bd = payerBankDetails.find(b => b.id === bdId);
    if (bd) setBankName(bd.bank_name);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Укажите сумму');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('loan_payments').insert({
        loan_id: loanId,
        payer_id: payerId,
        transfer_amount: parseFloat(amount),
        transfer_date: transferDate,
        transfer_method: transferMethod,
        bank_name: bankName.trim() || null,
        transaction_id: transactionId.trim() || null,
        payment_reference: paymentReference.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Погашение записано');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/15 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-md p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">Записать погашение</h3>
              <p className="text-xs text-muted-foreground">Платёж по договору займа</p>
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата перевода</Label>
            <Input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Способ</Label>
            <Select value={transferMethod} onValueChange={setTransferMethod}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Банковский перевод</SelectItem>
                <SelectItem value="sbp">СБП</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payer (borrower) bank detail */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Откуда отправлено (мои реквизиты)</Label>
            {payerBankDetails.length > 0 ? (
              <Select value={selectedPayerBdId} onValueChange={handlePayerSelect}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Выберите реквизит" /></SelectTrigger>
                <SelectContent>
                  {payerBankDetails.map(bd => (
                    <SelectItem key={bd.id} value={bd.id}>{formatBankLabel(bd)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Название банка" className={inputClass} />
            )}
          </div>

          {/* Lender bank detail (where repayment was sent) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Куда отправлено (реквизиты займодавца)</Label>
            {lenderBankDetails.length > 0 ? (
              <Select value={selectedLenderBdId} onValueChange={setSelectedLenderBdId}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Выберите реквизит" /></SelectTrigger>
                <SelectContent>
                  {lenderBankDetails.map(bd => (
                    <SelectItem key={bd.id} value={bd.id}>{formatBankLabel(bd)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">Реквизиты займодавца не добавлены</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID транзакции</Label>
            <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Назначение платежа</Label>
            <Input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} className={inputClass} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Отмена</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl h-11 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />}
              Записать
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
