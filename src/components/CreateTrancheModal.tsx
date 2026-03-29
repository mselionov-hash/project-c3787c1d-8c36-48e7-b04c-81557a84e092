import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { X, Loader2, Banknote } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Tables } from '@/integrations/supabase/types';

type BankDetail = Tables<'bank_details'>;

interface CreateTrancheModalProps {
  loanId: string;
  userId: string;
  lenderId: string;
  borrowerId: string | null;
  nextTrancheNumber: number;
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

export const CreateTrancheModal = ({
  loanId,
  userId,
  lenderId,
  borrowerId,
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

  const [senderBankDetails, setSenderBankDetails] = useState<BankDetail[]>([]);
  const [receiverBankDetails, setReceiverBankDetails] = useState<BankDetail[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');

  const inputClass = 'h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card';

  useEffect(() => {
    const fetchBankDetails = async () => {
      const { data: senderData } = await supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', lenderId);
      
      const senderList = senderData || [];
      setSenderBankDetails(senderList);
      
      // Auto-select if only one or default
      const defaultSender = senderList.find(b => b.is_default) || (senderList.length === 1 ? senderList[0] : null);
      if (defaultSender) {
        setSelectedSenderId(defaultSender.id);
        setSenderDisplay(formatBankLabel(defaultSender));
      }

      if (borrowerId) {
        const { data: receiverData } = await supabase
          .from('bank_details')
          .select('*')
          .eq('user_id', borrowerId);
        
        const receiverList = receiverData || [];
        setReceiverBankDetails(receiverList);
        
        const defaultReceiver = receiverList.find(b => b.is_default) || (receiverList.length === 1 ? receiverList[0] : null);
        if (defaultReceiver) {
          setSelectedReceiverId(defaultReceiver.id);
          setReceiverDisplay(formatBankLabel(defaultReceiver));
        }
      }
    };
    fetchBankDetails();
  }, [lenderId, borrowerId]);

  const handleSenderSelect = (bdId: string) => {
    setSelectedSenderId(bdId);
    const bd = senderBankDetails.find(b => b.id === bdId);
    if (bd) setSenderDisplay(formatBankLabel(bd));
  };

  const handleReceiverSelect = (bdId: string) => {
    setSelectedReceiverId(bdId);
    const bd = receiverBankDetails.find(b => b.id === bdId);
    if (bd) setReceiverDisplay(formatBankLabel(bd));
  };

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
        sender_bank_detail_id: selectedSenderId || null,
        receiver_bank_detail_id: selectedReceiverId || null,
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
      <div className="card-elevated w-full max-w-md p-7 max-h-[90vh] overflow-y-auto">
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

          {/* Sender (lender) bank detail */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Счёт отправителя (займодавец)</Label>
            {senderBankDetails.length > 0 ? (
              <Select value={selectedSenderId} onValueChange={handleSenderSelect}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Выберите реквизит" /></SelectTrigger>
                <SelectContent>
                  {senderBankDetails.map(bd => (
                    <SelectItem key={bd.id} value={bd.id}>{formatBankLabel(bd)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={senderDisplay} onChange={e => setSenderDisplay(e.target.value)} placeholder="Номер карты / счёт" className={inputClass} />
            )}
          </div>

          {/* Receiver (borrower) bank detail */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Счёт получателя (заёмщик)</Label>
            {receiverBankDetails.length > 0 ? (
              <Select value={selectedReceiverId} onValueChange={handleReceiverSelect}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Выберите реквизит" /></SelectTrigger>
                <SelectContent>
                  {receiverBankDetails.map(bd => (
                    <SelectItem key={bd.id} value={bd.id}>{formatBankLabel(bd)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={receiverDisplay} onChange={e => setReceiverDisplay(e.target.value)} placeholder="Номер карты / счёт" className={inputClass} />
            )}
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
