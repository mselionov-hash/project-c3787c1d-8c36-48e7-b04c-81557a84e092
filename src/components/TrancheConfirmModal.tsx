import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { X, Loader2, CheckCircle2, ChevronDown, AlertTriangle } from 'lucide-react';
import { ProofUpload } from '@/components/ProofUpload';
import { AiPaymentProofCheck, type AiAnalysisResult } from '@/components/AiPaymentProofCheck';
import type { Tables } from '@/integrations/supabase/types';

type Tranche = Tables<'loan_tranches'>;

interface TrancheConfirmModalProps {
  tranche: Tranche;
  userId: string;
  loanLimit: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const TrancheConfirmModal = ({ tranche, userId, loanLimit, onClose, onSuccess }: TrancheConfirmModalProps) => {
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualDate, setManualDate] = useState(tranche.actual_date || new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(tranche.actual_time || '');
  const [manualBankDocId, setManualBankDocId] = useState(tranche.bank_document_id || '');
  const [manualBankDocDate, setManualBankDocDate] = useState(tranche.bank_document_date || '');
  const [saving, setSaving] = useState(false);
  const [proofFiles, setProofFiles] = useState<string[]>(
    tranche.transfer_source ? tranche.transfer_source.split(',').filter(Boolean) : []
  );

  const inputClass = 'h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card';

  const aiOk = aiResult?.ok && (aiResult.risk_level === 'LOW' || aiResult.risk_level === 'MEDIUM');
  const aiBlocking = aiResult?.ok && aiResult.risk_level === 'BLOCKING';
  const aiHigh = aiResult?.ok && aiResult.risk_level === 'HIGH';

  // Resolve final values for save
  const resolveSaveData = () => {
    if (manualMode) {
      return {
        actual_date: manualDate || null,
        actual_time: manualTime || null,
        bank_document_id: manualBankDocId.trim() || null,
        bank_document_date: manualBankDocDate || null,
      };
    }
    const e = aiResult?.extracted;
    return {
      actual_date: e?.payment_date || null,
      actual_time: e?.payment_time || null,
      bank_document_id: e?.operation_id || null,
      bank_document_date: e?.payment_date || null,
    };
  };

  const canConfirm = (() => {
    if (proofFiles.length === 0) return false;
    if (manualMode) return !!manualDate;
    if (!aiResult?.ok) return false;
    if (aiBlocking) return false;
    return true;
  })();

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const { data: activeTranches } = await supabase
        .from('loan_tranches')
        .select('id, amount, status')
        .eq('loan_id', tranche.loan_id)
        .in('status', ['planned', 'sent', 'confirmed']);
      const otherTotal = (activeTranches || [])
        .filter(t => t.id !== tranche.id)
        .reduce((s, t) => s + Number(t.amount), 0);
      const wouldBeTotal = otherTotal + Number(tranche.amount);

      if (wouldBeTotal > loanLimit) {
        toast.error(`Подтверждение невозможно: общая сумма траншей (${wouldBeTotal.toLocaleString('ru-RU')} ₽) превысит лимит договора (${loanLimit.toLocaleString('ru-RU')} ₽)`);
        setSaving(false);
        return;
      }

      const saveData = resolveSaveData();

      const { error } = await supabase
        .from('loan_tranches')
        .update({
          status: 'confirmed',
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
          ...saveData,
          transfer_source: proofFiles.length > 0 ? proofFiles.join(',') : null,
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
      <div className="card-elevated w-full max-w-md p-7 max-h-[90vh] overflow-y-auto">
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Шаг 1. Загрузите чек о переводе
            </Label>
            <ProofUpload
              entityType="tranche"
              entityId={tranche.id}
              userId={userId}
              pendingFiles={proofFiles}
              onPendingChange={setProofFiles}
              compact
            />
          </div>

          {proofFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Шаг 2. AI-проверка чека
              </Label>
              <AiPaymentProofCheck
                loanId={tranche.loan_id}
                entityType="tranche"
                entityId={tranche.id}
                expectedAmount={Number(tranche.amount)}
                expectedRoleContext="tranche_disbursement"
                fileUrls={proofFiles}
                onAnalysisComplete={(r) => { setAiResult(r); setManualMode(false); }}
              />
            </div>
          )}

          {aiHigh && !manualMode && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-foreground/80">
                AI обнаружил расхождения. Проверьте данные перед подтверждением или заполните вручную.
              </div>
            </div>
          )}

          {/* Manual fallback */}
          {proofFiles.length > 0 && (
            <Collapsible open={manualMode} onOpenChange={setManualMode}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${manualMode ? 'rotate-180' : ''}`} />
                  Заполнить вручную (если AI не распознал чек)
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Фактическая дата</Label>
                  <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Время</Label>
                  <Input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID банковского документа</Label>
                  <Input value={manualBankDocId} onChange={e => setManualBankDocId(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата банковского документа</Label>
                  <Input type="date" value={manualBankDocDate} onChange={e => setManualBankDocDate(e.target.value)} className={inputClass} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Отмена</Button>
            <Button onClick={handleConfirm} disabled={saving || !canConfirm} className="flex-1 rounded-xl h-11 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Подтвердить
            </Button>
          </div>
          {!canConfirm && proofFiles.length > 0 && !aiResult && (
            <p className="text-[11px] text-muted-foreground text-center">
              Запустите AI-проверку чека или заполните данные вручную.
            </p>
          )}
          {aiBlocking && (
            <p className="text-[11px] text-destructive text-center">
              Этот файл не подходит как доказательство платежа.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
