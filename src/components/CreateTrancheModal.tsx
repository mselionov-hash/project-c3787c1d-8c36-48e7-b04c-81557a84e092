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
import { ProofUpload } from '@/components/ProofUpload';
import {
  fetchCurrentAllowedBankDetails,
  filterCompatibleLoanBoundBankDetails,
  formatLoanBoundBankLabel,
  formatPrintableBankDetail,
  supportsBankTransfer,
  supportsSbp,
  type LoanBoundBankDetail,
} from '@/lib/loan-bank-details';

type BankDetail = LoanBoundBankDetail;

interface CreateTrancheModalProps {
  loanId: string;
  userId: string;
  lenderId: string;
  borrowerId: string | null;
  nextTrancheNumber: number;
  contractNumber: string | null;
  loanLimit: number;
  onClose: () => void;
  onSuccess: () => void;
}

const formatBankLabel = (bd: BankDetail) => formatLoanBoundBankLabel(bd);

export const CreateTrancheModal = ({
  loanId,
  userId,
  lenderId,
  borrowerId,
  nextTrancheNumber,
  contractNumber,
  loanLimit,
  onClose,
  onSuccess,
}: CreateTrancheModalProps) => {
  const defaultReference = contractNumber
    ? `Перевод по договору займа № ${contractNumber}`
    : 'Перевод по договору займа';
  const [amount, setAmount] = useState('');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('bank_transfer');
  const [senderDisplay, setSenderDisplay] = useState('');
  const [receiverDisplay, setReceiverDisplay] = useState('');
  const [referenceText, setReferenceText] = useState(defaultReference);
  const [saving, setSaving] = useState(false);
  const [proofFiles, setProofFiles] = useState<string[]>([]);
  const [cumulativeDisbursed, setCumulativeDisbursed] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(true);

  const [senderBankDetails, setSenderBankDetails] = useState<BankDetail[]>([]);
  const [receiverBankDetails, setReceiverBankDetails] = useState<BankDetail[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');

  const inputClass = 'h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card';

  useEffect(() => {
    const fetchData = async () => {
      setLoadingDetails(true);

      const [loanRes, tranchesRes, allowedDetails] = await Promise.all([
        supabase.from('loans').select('*').eq('id', loanId).single(),
        supabase
          .from('loan_tranches')
          .select('amount')
          .eq('loan_id', loanId)
          .in('status', ['planned', 'sent', 'confirmed']),
        fetchCurrentAllowedBankDetails(loanId),
      ]);

      const total = (tranchesRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
      setCumulativeDisbursed(total);

      const loanData = loanRes.data;
      const senderList = loanData
        ? filterCompatibleLoanBoundBankDetails(loanData, allowedDetails, 'lender', 'disbursement')
        : [];
      setSenderBankDetails(senderList);

      const defaultSender = senderList.length === 1 ? senderList[0] : senderList.find(b => b.is_default) || null;
      if (defaultSender) {
        setSelectedSenderId(defaultSender.id);
        setSenderDisplay(formatBankLabel(defaultSender));
      }

      const receiverList = loanData
        ? filterCompatibleLoanBoundBankDetails(loanData, allowedDetails, 'borrower', 'disbursement')
        : [];
      setReceiverBankDetails(receiverList);

      const defaultReceiver = receiverList.length === 1 ? receiverList[0] : receiverList.find(b => b.is_default) || null;
      if (defaultReceiver) {
        setSelectedReceiverId(defaultReceiver.id);
        setReceiverDisplay(formatBankLabel(defaultReceiver));
      }

      setLoadingDetails(false);
    };
    fetchData();
  }, [loanId, lenderId, borrowerId]);

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

  const remaining = loanLimit - cumulativeDisbursed;
  const parsedAmount = parseFloat(amount) || 0;
  const wouldExceed = parsedAmount > 0 && (cumulativeDisbursed + parsedAmount) > loanLimit;
  const selectedSender = senderBankDetails.find(detail => detail.id === selectedSenderId);
  const selectedReceiver = receiverBankDetails.find(detail => detail.id === selectedReceiverId);
  const selectedMethodSupported = Boolean(
    selectedSender
    && selectedReceiver
    && (method === 'sbp'
      ? supportsSbp(selectedSender) && supportsSbp(selectedReceiver)
      : supportsBankTransfer(selectedSender) && supportsBankTransfer(selectedReceiver))
  );

  const handleSave = async () => {
    if (!amount || parsedAmount <= 0) {
      toast.error('Укажите сумму транша');
      return;
    }
    if (!plannedDate) {
      toast.error('Укажите дату');
      return;
    }

    if (!selectedSender || !selectedReceiver) {
      toast.error('Сначала выберите согласованные реквизиты займодавца и заёмщика из Приложения № 1');
      return;
    }

    if (!selectedMethodSupported) {
      toast.error('Выбранные реквизиты не поддерживают указанный способ перевода');
      return;
    }

    const [{ data: freshTranches }, loanRes, allowedDetails] = await Promise.all([
      supabase
        .from('loan_tranches')
        .select('amount')
        .eq('loan_id', loanId)
        .in('status', ['planned', 'sent', 'confirmed']),
      supabase.from('loans').select('*').eq('id', loanId).single(),
      fetchCurrentAllowedBankDetails(loanId),
    ]);

    const freshLoan = loanRes.data;
    const currentTotal = (freshTranches || []).reduce((s, t) => s + Number(t.amount), 0);

    if (!freshLoan) {
      toast.error('Не удалось проверить актуальные условия займа');
      return;
    }

    const senderStillAllowed = filterCompatibleLoanBoundBankDetails(freshLoan, allowedDetails, 'lender', 'disbursement')
      .find(detail => detail.id === selectedSender.id);
    const receiverStillAllowed = filterCompatibleLoanBoundBankDetails(freshLoan, allowedDetails, 'borrower', 'disbursement')
      .find(detail => detail.id === selectedReceiver.id);

    if (!senderStillAllowed || !receiverStillAllowed) {
      toast.error('Согласованные реквизиты для выдачи транша отсутствуют или больше неактуальны');
      return;
    }

    if (currentTotal + parsedAmount > Number(freshLoan.amount)) {
      const freshRemaining = Math.max(0, Number(freshLoan.amount) - currentTotal);
      toast.error(`Сумма транша превышает остаток лимита. Максимум: ${freshRemaining.toLocaleString('ru-RU')} ₽`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('loan_tranches').insert({
        loan_id: loanId,
        created_by: userId,
        tranche_number: nextTrancheNumber,
        amount: parsedAmount,
        planned_date: plannedDate,
        method,
        sender_account_display: formatPrintableBankDetail(senderStillAllowed),
        receiver_account_display: formatPrintableBankDetail(receiverStillAllowed),
        sender_bank_detail_id: senderStillAllowed.id,
        receiver_bank_detail_id: receiverStillAllowed.id,
        reference_text: referenceText.trim() || null,
        transfer_source: proofFiles.length > 0 ? proofFiles.join(',') : null,
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

        {/* Limit info */}
        <div className="rounded-lg bg-muted/50 border border-border/40 p-3 mb-4 text-xs space-y-0.5">
          <div className="flex justify-between"><span className="text-muted-foreground">Лимит договора</span><span className="font-medium">{loanLimit.toLocaleString('ru-RU')} ₽</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Уже выдано / в процессе</span><span className="font-medium">{cumulativeDisbursed.toLocaleString('ru-RU')} ₽</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Доступный остаток</span><span className={`font-semibold ${remaining <= 0 ? 'text-destructive' : 'text-primary'}`}>{remaining.toLocaleString('ru-RU')} ₽</span></div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Сумма (₽) *</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
            {wouldExceed && (
              <p className="text-xs text-destructive">Превышение лимита! Максимум: {remaining.toLocaleString('ru-RU')} ₽</p>
            )}
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
              <p className="text-xs text-destructive">Для выдачи транша займодавец должен выбрать согласованный реквизит в Приложении № 1.</p>
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
              <p className="text-xs text-destructive">Для выдачи транша заёмщик должен выбрать согласованный реквизит в Приложении № 1.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Комментарий</Label>
            <Input value={referenceText} onChange={e => setReferenceText(e.target.value)} placeholder="Комментарий к переводу" className={inputClass} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Подтверждение перевода</Label>
            <ProofUpload
              entityType="tranche"
              userId={userId}
              pendingFiles={proofFiles}
              onPendingChange={setProofFiles}
              compact
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Отмена</Button>
            <Button onClick={handleSave} disabled={saving || loadingDetails || wouldExceed || remaining <= 0 || !selectedSenderId || !selectedReceiverId || !selectedMethodSupported} className="flex-1 rounded-xl h-11 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              Создать
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
