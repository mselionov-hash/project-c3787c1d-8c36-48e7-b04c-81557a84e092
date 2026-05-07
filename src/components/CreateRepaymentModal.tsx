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
import { ProofUpload } from '@/components/ProofUpload';
import { AiPaymentProofCheck, type AiAnalysisResult } from '@/components/AiPaymentProofCheck';
import { AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { isAiProofCriticallyValid, isManualFallbackAllowed } from '@/lib/ai-proof-validation';
import { ShieldX } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import {
  fetchCurrentAllowedBankDetails,
  filterCompatibleLoanBoundBankDetails,
  formatLoanBoundBankLabel,
  type LoanBoundBankDetail,
} from '@/lib/loan-bank-details';

type BankDetail = Tables<'bank_details'>;
type AllowedBankDetail = LoanBoundBankDetail;

interface CreateRepaymentModalProps {
  loanId: string;
  payerId: string;
  lenderId: string;
  contractNumber: string | null;
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
  contractNumber,
  onClose,
  onSuccess,
}: CreateRepaymentModalProps) => {
  const defaultReference = contractNumber
    ? `Возврат по договору займа № ${contractNumber}`
    : 'Возврат по договору займа';
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferMethod, setTransferMethod] = useState('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentReference, setPaymentReference] = useState(defaultReference);
  const [saving, setSaving] = useState(false);
  const [proofFiles, setProofFiles] = useState<string[]>([]);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [manualReason, setManualReason] = useState('');

  const [payerBankDetails, setPayerBankDetails] = useState<BankDetail[]>([]);
  const [lenderBankDetails, setLenderBankDetails] = useState<AllowedBankDetail[]>([]);
  const [selectedPayerBdId, setSelectedPayerBdId] = useState<string>('');
  const [selectedLenderBdId, setSelectedLenderBdId] = useState<string>('');

  const inputClass = 'h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card';

  useEffect(() => {
    const fetchBankDetails = async () => {
      const [{ data: payerData }, loanRes, allowedDetails] = await Promise.all([
        supabase
          .from('bank_details')
          .select('*')
          .eq('user_id', payerId),
        supabase.from('loans').select('*').eq('id', loanId).single(),
        fetchCurrentAllowedBankDetails(loanId),
      ]);

      const payerList = payerData || [];
      setPayerBankDetails(payerList);

      const defaultPayer = payerList.find(b => b.is_default) || (payerList.length === 1 ? payerList[0] : null);
      if (defaultPayer) {
        setSelectedPayerBdId(defaultPayer.id);
      }

      const lenderList = loanRes.data
        ? filterCompatibleLoanBoundBankDetails(loanRes.data, allowedDetails, 'lender', 'repayment')
        : [];
      setLenderBankDetails(lenderList);

      const defaultLender = lenderList.length === 1 ? lenderList[0] : lenderList.find(b => b.is_default) || null;
      if (defaultLender) {
        setSelectedLenderBdId(defaultLender.id);
        setBankName(defaultLender.bank_name);
      }
    };
    fetchBankDetails();
  }, [payerId, lenderId, loanId]);

  const handlePayerSelect = (bdId: string) => {
    setSelectedPayerBdId(bdId);
  };

  const handleLenderSelect = (bdId: string) => {
    setSelectedLenderBdId(bdId);
    const bd = lenderBankDetails.find(b => b.id === bdId);
    if (bd) setBankName(bd.bank_name);
  };

  const validation = isAiProofCriticallyValid(aiResult, 'repayment');
  const manualAllowed = isManualFallbackAllowed(aiResult, 'repayment');
  const extractedAmount = aiResult?.ok ? aiResult.extracted?.amount ?? null : null;
  const amountMismatch =
    extractedAmount != null && amount && Number.isFinite(Number(amount))
      ? Math.abs(Number(amount) - Number(extractedAmount)) > Math.max(1, Number(amount) * 0.005)
      : false;

  const useExtractedAmount = () => {
    if (extractedAmount != null) setAmount(String(extractedAmount));
  };

  const canSave = (() => {
    if (!amount || parseFloat(amount) <= 0) return false;
    if (!selectedLenderBdId) return false;
    if (proofFiles.length === 0) {
      // Proof is mandatory by default. Manual override allowed only with explicit reason.
      return manualOverride && manualReason.trim().length >= 5;
    }
    if (!aiResult) return false; // proof uploaded but AI not run yet
    if (!aiResult.ok) return manualOverride && manualAllowed && manualReason.trim().length >= 5;
    if (aiResult.risk_level === 'BLOCKING') return false;
    if (amountMismatch) return false;
    if (manualOverride) return manualAllowed && manualReason.trim().length >= 5;
    return validation.ok;
  })();

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Укажите сумму');
      return;
    }

    if (!selectedLenderBdId) {
      toast.error('Сначала выберите согласованный реквизит займодавца для возврата');
      return;
    }

    const selectedLender = lenderBankDetails.find(detail => detail.id === selectedLenderBdId);
    if (!selectedLender) {
      toast.error('Согласованный реквизит займодавца для возврата не найден');
      return;
    }

    setSaving(true);
    try {
      const usedAi = !manualOverride && !!aiResult?.ok;
      const { error } = await supabase.from('loan_payments').insert({
        loan_id: loanId,
        payer_id: payerId,
        transfer_amount: parseFloat(amount),
        transfer_date: transferDate,
        transfer_method: transferMethod,
        bank_name: selectedLender.bank_name.trim() || null,
        transaction_id: transactionId.trim() || null,
        payment_reference: paymentReference.trim() || null,
        screenshot_url: proofFiles.length > 0 ? proofFiles.join(',') : null,
        status: 'pending',
        ai_fraud_check_id: aiResult?.record_ids?.check_id ?? null,
        ai_risk_level: aiResult?.risk_level ?? null,
        used_ai_extracted_data: usedAi,
        manual_override: manualOverride,
        manual_override_reason: manualOverride ? manualReason.trim() : null,
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
              <Select value={selectedLenderBdId} onValueChange={handleLenderSelect}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Выберите реквизит" /></SelectTrigger>
                <SelectContent>
                  {lenderBankDetails.map(bd => (
                    <SelectItem key={bd.id} value={bd.id}>{formatLoanBoundBankLabel(bd)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-destructive">Реквизиты займодавца для возврата не согласованы в Приложении № 1</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID транзакции</Label>
            <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Комментарий</Label>
            <Input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Комментарий к платежу" className={inputClass} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Подтверждение перевода</Label>
            <ProofUpload
              entityType="repayment"
              userId={payerId}
              pendingFiles={proofFiles}
              onPendingChange={setProofFiles}
              compact
            />
            {proofFiles.length === 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-2">
                <div className="flex items-start gap-2 text-foreground/80">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>Загрузите чек/подтверждение перевода. Без чека запись возможна только в режиме ручного подтверждения с указанием причины.</div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualOverride}
                    onChange={e => { setManualOverride(e.target.checked); if (!e.target.checked) setManualReason(''); }}
                  />
                  Записать без чека (ручное подтверждение)
                </label>
                {manualOverride && (
                  <Textarea
                    value={manualReason}
                    onChange={e => setManualReason(e.target.value)}
                    placeholder="Причина ручного подтверждения (минимум 5 символов)"
                    className="min-h-[64px] rounded-xl bg-muted/50 border-border/50 text-xs"
                  />
                )}
              </div>
            )}
            {proofFiles.length > 0 && (
              <AiPaymentProofCheck
                loanId={loanId}
                entityType="repayment"
                expectedAmount={amount ? Number(amount) : null}
                expectedRoleContext="loan_repayment"
                fileUrls={proofFiles}
                className="pt-2"
                onAnalysisComplete={(r) => {
                  setAiResult(r);
                  if (r.ok && r.extracted) {
                    const e = r.extracted;
                    if (!amount && e.amount != null) setAmount(String(e.amount));
                    if (e.payment_date) setTransferDate(e.payment_date);
                    if (e.operation_id) setTransactionId(e.operation_id);
                    if (e.bank_name) setBankName(e.bank_name);
                    if (e.payment_purpose) setPaymentReference(e.payment_purpose);
                  }
                }}
              />
            )}
            {amountMismatch && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-2">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    Сумма в чеке ({Number(extractedAmount).toLocaleString('ru-RU')} ₽) не совпадает с суммой погашения ({Number(amount).toLocaleString('ru-RU')} ₽). Измените сумму на распознанную или загрузите другой чек.
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={useExtractedAmount} className="rounded-lg">
                  Использовать сумму из чека
                </Button>
              </div>
            )}
            {aiResult?.ok && !validation.ok && !manualOverride && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 font-semibold text-destructive">
                  <ShieldX className="w-4 h-4" /> Создание погашения заблокировано
                </div>
                <ul className="text-foreground/80 space-y-0.5 pl-1">
                  {validation.reasons.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            )}
            {proofFiles.length > 0 && manualAllowed && aiResult && (!aiResult.ok || aiResult.risk_level === 'HIGH' || aiResult.risk_level === 'MEDIUM') && (
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualOverride}
                    onChange={e => { setManualOverride(e.target.checked); if (!e.target.checked) setManualReason(''); }}
                  />
                  Подтвердить вручную (AI не распознал чек или риск высокий)
                </label>
                {manualOverride && (
                  <Textarea
                    value={manualReason}
                    onChange={e => setManualReason(e.target.value)}
                    placeholder="Причина ручного подтверждения (минимум 5 символов)"
                    className="min-h-[64px] rounded-xl bg-muted/50 border-border/50 text-xs"
                  />
                )}
              </div>
            )}
            {proofFiles.length > 0 && aiResult?.ok && !manualAllowed && (
              <p className="text-[11px] text-destructive">
                Ручной ввод недоступен: чек содержит критическую проблему (иностранный банк, не-RUB валюта, операция не исполнена, дубликат или превышение лимита). Загрузите корректный чек.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !canSave} className="flex-1 rounded-xl h-11 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />}
              Записать
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
