import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AiCheckEntityType = 'tranche' | 'repayment';
export type AiRoleContext = 'tranche_disbursement' | 'loan_repayment';

interface AiPaymentProofCheckProps {
  loanId: string;
  entityType: AiCheckEntityType;
  entityId?: string | null;
  expectedAmount?: number | null;
  expectedRoleContext?: AiRoleContext;
  fileUrls: string[];
  className?: string;
}

type Check = { id: string; level: 'ok' | 'info' | 'warn' | 'high' | 'blocking'; message: string };

interface AnalysisResult {
  ok: boolean;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING';
  risk_score?: number;
  blocking_reasons?: string[];
  checks?: Check[];
  ai_summary?: string;
  fraud_signals?: any[];
  document_classification?: {
    is_payment_proof?: boolean | null;
    is_russian_bank_receipt?: boolean | null;
    document_type?: string | null;
    bank_country?: string | null;
    payment_status?: string | null;
    rejection_reason?: string | null;
  };
  extracted?: {
    amount?: number | null;
    currency?: string | null;
    payment_date?: string | null;
    payment_time?: string | null;
    sender_name?: string | null;
    receiver_name?: string | null;
    bank_name?: string | null;
    operation_id?: string | null;
    payment_purpose?: string | null;
    confidence?: number | null;
  };
  error?: string;
  stage?: string;
  httpStatus?: number;
}

const readFunctionError = async (error: any): Promise<AnalysisResult> => {
  const resp = error?.context;
  if (resp instanceof Response) {
    try {
      const t = await resp.clone().text();
      try {
        return { ok: false, httpStatus: resp.status, ...JSON.parse(t) };
      } catch {
        return { ok: false, httpStatus: resp.status, error: t || error.message };
      }
    } catch { /* ignore */ }
  }
  return { ok: false, error: error?.message ?? 'Неизвестная ошибка' };
};

const RISK_META: Record<NonNullable<AnalysisResult['risk_level']>, { label: string; cls: string; Icon: any }> = {
  LOW: { label: 'Низкий риск', cls: 'text-primary border-primary/30 bg-primary/5', Icon: ShieldCheck },
  MEDIUM: { label: 'Средний риск', cls: 'text-amber-500 border-amber-500/30 bg-amber-500/5', Icon: ShieldAlert },
  HIGH: { label: 'Высокий риск', cls: 'text-destructive border-destructive/30 bg-destructive/5', Icon: ShieldAlert },
  BLOCKING: { label: 'Блокирующая проблема', cls: 'text-destructive border-destructive/40 bg-destructive/10', Icon: ShieldX },
};

const CHECK_ICON: Record<Check['level'], any> = {
  ok: CheckCircle2, info: Info, warn: AlertTriangle, high: AlertTriangle, blocking: ShieldX,
};
const CHECK_CLS: Record<Check['level'], string> = {
  ok: 'text-primary',
  info: 'text-muted-foreground',
  warn: 'text-amber-500',
  high: 'text-destructive',
  blocking: 'text-destructive',
};

const formatAmount = (v: number | null | undefined, currency?: string | null) =>
  v == null ? '—' : `${Number(v).toLocaleString('ru-RU')} ${currency || 'RUB'}`;

export const AiPaymentProofCheck = ({
  loanId,
  entityType,
  entityId,
  expectedAmount,
  expectedRoleContext,
  fileUrls,
  className,
}: AiPaymentProofCheckProps) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const fileUrl = fileUrls?.[0] ?? null;
  const disabled = !fileUrl || running;

  const run = async () => {
    if (!fileUrl) return;
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-payment-proof-analysis', {
        body: {
          loan_id: loanId,
          entity_type: entityType,
          entity_id: entityId ?? null,
          file_url: fileUrl,
          expected_amount: expectedAmount ?? null,
          expected_role_context:
            expectedRoleContext ??
            (entityType === 'tranche' ? 'tranche_disbursement' : 'loan_repayment'),
        },
      });
      if (error) {
        setResult(await readFunctionError(error));
      } else {
        setResult(data as AnalysisResult);
      }
    } catch (e: any) {
      setResult({ ok: false, error: e.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          AI-проверка чека (носит информационный характер, не подтверждает платёж).
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={run}
          disabled={disabled}
          className="rounded-lg gap-2"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {running ? 'AI проверяет чек…' : 'Проверить чек AI'}
        </Button>
      </div>

      {!fileUrl && (
        <p className="text-xs text-muted-foreground">
          Загрузите файл подтверждения, чтобы запустить AI-проверку.
        </p>
      )}

      {result && !result.ok && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <div className="font-semibold mb-1">AI-проверка не выполнена</div>
          <div>{result.error || 'Неизвестная ошибка'}</div>
        </div>
      )}

      {result && result.ok && result.risk_level && (
        <div className={cn('rounded-xl border p-4 space-y-3', RISK_META[result.risk_level].cls)}>
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = RISK_META[result.risk_level!].Icon;
              return <Icon className="w-5 h-5" />;
            })()}
            <span className="font-bold text-sm">{RISK_META[result.risk_level].label}</span>
            {typeof result.risk_score === 'number' && (
              <span className="text-xs text-muted-foreground ml-auto">баллы: {result.risk_score}</span>
            )}
          </div>

          {result.ai_summary && (
            <p className="text-xs text-foreground/90 whitespace-pre-wrap">{result.ai_summary}</p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="text-muted-foreground">Сумма</div>
            <div className="font-medium text-foreground">{formatAmount(result.extracted?.amount, result.extracted?.currency)}</div>
            <div className="text-muted-foreground">Дата / время</div>
            <div className="font-medium text-foreground">
              {result.extracted?.payment_date || '—'}
              {result.extracted?.payment_time ? ` ${result.extracted.payment_time}` : ''}
            </div>
            <div className="text-muted-foreground">Отправитель</div>
            <div className="font-medium text-foreground truncate">{result.extracted?.sender_name || '—'}</div>
            <div className="text-muted-foreground">Получатель</div>
            <div className="font-medium text-foreground truncate">{result.extracted?.receiver_name || '—'}</div>
            <div className="text-muted-foreground">Банк</div>
            <div className="font-medium text-foreground truncate">{result.extracted?.bank_name || '—'}</div>
            <div className="text-muted-foreground">ID операции</div>
            <div className="font-medium text-foreground truncate">{result.extracted?.operation_id || '—'}</div>
            <div className="text-muted-foreground">Назначение</div>
            <div className="font-medium text-foreground truncate">{result.extracted?.payment_purpose || '—'}</div>
            <div className="text-muted-foreground">Уверенность</div>
            <div className="font-medium text-foreground">
              {result.extracted?.confidence != null
                ? `${(Number(result.extracted.confidence) * 100).toFixed(0)}%`
                : '—'}
            </div>
          </div>

          {result.blocking_reasons && result.blocking_reasons.length > 0 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive space-y-1">
              <div className="font-semibold">Блокирующие причины:</div>
              {result.blocking_reasons.map((r, i) => <div key={i}>• {r}</div>)}
            </div>
          )}

          {result.checks && result.checks.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Детерминистические проверки
              </div>
              <ul className="space-y-1">
                {result.checks.map((c, i) => {
                  const Icon = CHECK_ICON[c.level];
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Icon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', CHECK_CLS[c.level])} />
                      <span className="text-foreground/90">{c.message}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground italic">
            AI-результат носит рекомендательный характер. Подтверждение операции остаётся за вами.
          </p>
        </div>
      )}
    </div>
  );
};
