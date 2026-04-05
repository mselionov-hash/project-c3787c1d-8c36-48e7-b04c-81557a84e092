import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EdoRegulationAcceptanceProps {
  userId: string;
  loanId: string;
  /** @deprecated use loanId instead */
  counterpartyId?: string | null;
  compact?: boolean;
  onAccepted?: () => void;
}

interface RegulationState {
  hasRegulation: boolean;
  regulationId?: string;
  version?: string;
  title?: string;
  effectiveFrom?: string;
  userAccepted: boolean;
  counterpartyAccepted: boolean;
  bothAccepted: boolean;
}

export const EdoRegulationAcceptance = ({
  userId,
  loanId,
  compact = false,
  onAccepted,
}: EdoRegulationAcceptanceProps) => {
  const [state, setState] = useState<RegulationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_loan_edo_acceptance', {
        p_loan_id: loanId,
      });

      if (error || !data) {
        setState(null);
        setLoading(false);
        return;
      }

      const d = data as Record<string, unknown>;

      if (d.error === 'not_authorized' || d.has_regulation === false) {
        setState({ hasRegulation: false, userAccepted: false, counterpartyAccepted: false, bothAccepted: false });
        setLoading(false);
        return;
      }

      // Determine which party is "me"
      const { data: loan } = await supabase
        .from('loans')
        .select('lender_id, borrower_id')
        .eq('id', loanId)
        .single();

      const isLender = loan?.lender_id === userId;
      const myAccepted = isLender ? !!d.lender_accepted : !!d.borrower_accepted;
      const cpAccepted = isLender ? !!d.borrower_accepted : !!d.lender_accepted;

      setState({
        hasRegulation: true,
        regulationId: d.regulation_id as string,
        version: d.regulation_version as string,
        title: d.regulation_title as string,
        effectiveFrom: d.regulation_effective_from as string,
        userAccepted: myAccepted,
        counterpartyAccepted: cpAccepted,
        bothAccepted: !!d.both_accepted,
      });
    } catch {
      setState(null);
    }
    setLoading(false);
  }, [loanId, userId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleAccept = async () => {
    if (!state?.regulationId) return;
    setAccepting(true);
    try {
      let ip = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        ip = (await res.json()).ip;
      } catch {}

      const { error } = await supabase.from('edo_regulation_acceptances').insert({
        user_id: userId,
        regulation_id: state.regulationId,
        ip_address: ip,
        user_agent: navigator.userAgent,
      });
      if (error) throw error;

      toast.success('Регламент ЭДО принят');

      // Re-fetch both parties' state via RPC
      await loadState();
      onAccepted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Проверка регламента...
      </div>
    );
  }

  if (!state?.hasRegulation) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        Регламент ЭДО не опубликован на платформе.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <StatusLine accepted={state.userAccepted} label={state.userAccepted ? 'Вы приняли Регламент ЭДО' : 'Необходимо принять Регламент ЭДО'} version={state.version} />
        <StatusLine accepted={state.counterpartyAccepted} label={state.counterpartyAccepted ? 'Контрагент принял Регламент ЭДО' : 'Контрагент ещё не принял Регламент ЭДО'} />
        {!state.userAccepted && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1.5 w-full" onClick={handleAccept} disabled={accepting}>
            {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Принять Регламент ЭДО v{state.version}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="card-elevated p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Регламент электронного взаимодействия
        </h3>
      </div>

      <div className="rounded-lg bg-muted/30 border border-border/30 p-3">
        <p className="text-sm font-medium">{state.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Версия {state.version} • действует с{' '}
          {state.effectiveFrom ? new Date(state.effectiveFrom).toLocaleDateString('ru-RU') : '—'}
        </p>
      </div>

      <div className="space-y-2">
        <StatusLine accepted={state.userAccepted} label={state.userAccepted ? 'Вы приняли регламент' : 'Вы ещё не приняли регламент'} />
        <StatusLine accepted={state.counterpartyAccepted} label={state.counterpartyAccepted ? 'Контрагент принял регламент' : 'Контрагент ещё не принял регламент'} />
      </div>

      {!state.userAccepted && (
        <div className="pt-1">
          <p className="text-[10px] text-muted-foreground mb-2">
            Для использования электронной подписи (УНЭП) обе стороны должны принять текущую версию Регламента ЭДО.
          </p>
          <Button onClick={handleAccept} disabled={accepting} className="w-full gap-2 rounded-lg h-10 text-sm">
            {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Принять Регламент ЭДО
          </Button>
        </div>
      )}
    </div>
  );
};

const StatusLine = ({ accepted, label, version }: { accepted: boolean; label: string; version?: string }) => (
  <div className="flex items-center gap-2">
    {accepted ? (
      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
    ) : (
      <FileText className="w-4 h-4 text-warning flex-shrink-0" />
    )}
    <span className="text-xs">
      {label}
      {version && <span className="text-muted-foreground ml-1">v{version}</span>}
    </span>
  </div>
);
