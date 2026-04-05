import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface EdoRegulationAcceptanceProps {
  userId: string;
  /** If provided, also shows counterparty acceptance status */
  counterpartyId?: string | null;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Callback after acceptance */
  onAccepted?: () => void;
}

interface Regulation {
  id: string;
  version: string;
  title: string;
  effective_from: string;
}

export const EdoRegulationAcceptance = ({
  userId,
  counterpartyId,
  compact = false,
  onAccepted,
}: EdoRegulationAcceptanceProps) => {
  const [regulation, setRegulation] = useState<Regulation | null>(null);
  const [userAccepted, setUserAccepted] = useState(false);
  const [counterpartyAccepted, setCounterpartyAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadState();
  }, [userId, counterpartyId]);

  const loadState = async () => {
    // Get current regulation
    const { data: reg } = await supabase
      .from('edo_regulations')
      .select('id, version, title, effective_from')
      .eq('is_current', true)
      .limit(1)
      .single();

    if (!reg) {
      setLoading(false);
      return;
    }
    setRegulation(reg);

    // Check user acceptance
    const { data: userAcc } = await supabase
      .from('edo_regulation_acceptances')
      .select('id')
      .eq('user_id', userId)
      .eq('regulation_id', reg.id)
      .limit(1);

    setUserAccepted((userAcc?.length || 0) > 0);

    // Check counterparty acceptance
    if (counterpartyId) {
      const { data: cpAcc } = await supabase
        .from('edo_regulation_acceptances')
        .select('id')
        .eq('user_id', counterpartyId)
        .eq('regulation_id', reg.id)
        .limit(1);
      setCounterpartyAccepted((cpAcc?.length || 0) > 0);
    }

    setLoading(false);
  };

  const handleAccept = async () => {
    if (!regulation) return;
    setAccepting(true);
    try {
      let ip = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        ip = (await res.json()).ip;
      } catch {}

      const { error } = await supabase.from('edo_regulation_acceptances').insert({
        user_id: userId,
        regulation_id: regulation.id,
        ip_address: ip,
        user_agent: navigator.userAgent,
      });
      if (error) throw error;
      setUserAccepted(true);
      toast.success('Регламент ЭДО принят');
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

  if (!regulation) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        Регламент ЭДО не опубликован на платформе.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {userAccepted ? (
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-warning flex-shrink-0" />
          )}
          <span className="text-xs">
            {userAccepted ? 'Вы приняли Регламент ЭДО' : 'Необходимо принять Регламент ЭДО'}
            <span className="text-muted-foreground ml-1">v{regulation.version}</span>
          </span>
        </div>
        {counterpartyId && (
          <div className="flex items-center gap-2">
            {counterpartyAccepted ? (
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-warning flex-shrink-0" />
            )}
            <span className="text-xs">
              {counterpartyAccepted ? 'Контрагент принял Регламент ЭДО' : 'Контрагент ещё не принял Регламент ЭДО'}
            </span>
          </div>
        )}
        {!userAccepted && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg text-xs gap-1.5 w-full"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Принять Регламент ЭДО v{regulation.version}
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
        <p className="text-sm font-medium">{regulation.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Версия {regulation.version} • действует с{' '}
          {new Date(regulation.effective_from).toLocaleDateString('ru-RU')}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {userAccepted ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : (
            <FileText className="w-4 h-4 text-warning" />
          )}
          <span className="text-sm">
            {userAccepted ? 'Вы приняли регламент' : 'Вы ещё не приняли регламент'}
          </span>
        </div>

        {counterpartyId && (
          <div className="flex items-center gap-2">
            {counterpartyAccepted ? (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            ) : (
              <FileText className="w-4 h-4 text-warning" />
            )}
            <span className="text-sm">
              {counterpartyAccepted ? 'Контрагент принял регламент' : 'Контрагент ещё не принял регламент'}
            </span>
          </div>
        )}
      </div>

      {!userAccepted && (
        <div className="pt-1">
          <p className="text-[10px] text-muted-foreground mb-2">
            Для использования электронной подписи (УНЭП) обе стороны должны принять текущую версию Регламента ЭДО.
          </p>
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full gap-2 rounded-lg h-10 text-sm"
          >
            {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Принять Регламент ЭДО
          </Button>
        </div>
      )}
    </div>
  );
};
