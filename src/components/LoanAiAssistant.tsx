import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Send, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string; actions?: string[]; error?: boolean };

const QUICK_PROMPTS = [
  'Что мне делать дальше?',
  'Почему действие заблокировано?',
  'Какие документы доступны?',
  'Проверить статус займа',
  'Почему чек не прошёл?',
];

type ActionKind = 'section' | 'navigate' | 'followup';
type FollowupConfig = { intent: string; message: string; displayText: string };
const ACTION_LABELS: Record<string, { label: string; kind: ActionKind; payload?: string; followup?: FollowupConfig }> = {
  open_bank_details: { label: 'Открыть реквизиты', kind: 'section', payload: 'bank' },
  open_tranches: { label: 'Открыть транши', kind: 'section', payload: 'tranches' },
  open_repayments: { label: 'Открыть погашения', kind: 'section', payload: 'repayments' },
  open_documents: { label: 'Открыть документы', kind: 'navigate' },
  explain_ai_check: {
    label: 'Подробнее о проверке',
    kind: 'followup',
    followup: {
      intent: 'explain_ai_check',
      displayText: 'Подробнее о проверке',
      message: 'Объясни последнюю AI-проверку по этому займу: что именно не так, почему это важно, блокирует ли это подтверждение и какой файл нужно загрузить вместо текущего.',
    },
  },
  explain_status: {
    label: 'Подробнее о статусе',
    kind: 'followup',
    followup: {
      intent: 'explain_status',
      displayText: 'Подробнее о статусе',
      message: 'Объясни текущий статус займа: что уже произошло, что осталось и какой следующий шаг для моей роли.',
    },
  },
};

const INTERNAL_PREFIX_RE = /^(INTENT|SYSTEM|INTERNAL|DEBUG)\s*:/i;

interface Props {
  loanId: string;
  onAction?: (action: string) => void;
}

export function LoanAiAssistant({ loanId, onAction }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (text: string, options?: { intent?: string; displayText?: string }) => {
    const message = text.trim();
    if (!message || loading) return;
    const visible = (options?.displayText ?? message).trim();
    // Never expose internal markers in chat history
    const safeVisible = INTERNAL_PREFIX_RE.test(visible) ? 'Запрос помощника' : visible;
    setMessages((m) => [...m, { role: 'user', content: safeVisible }]);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('loan-ai-assistant', {
        body: { loan_id: loanId, message, intent: options?.intent ?? null },
      });
      if (error || !data?.ok) {
        const errMsg = (data as any)?.error ?? error?.message ?? 'Не удалось получить ответ';
        setMessages((m) => [...m, { role: 'assistant', content: errMsg, error: true }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data.answer, actions: data.suggested_actions ?? [] }]);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: e?.message ?? 'Сетевая ошибка', error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string) => {
    const cfg = ACTION_LABELS[action];
    if (!cfg) return;
    if (cfg.kind === 'section' && cfg.payload) {
      onAction?.(cfg.payload);
      setOpen(false);
    } else if (cfg.kind === 'navigate') {
      navigate(`/documents?loan=${loanId}`);
      setOpen(false);
    } else if (cfg.kind === 'followup' && cfg.followup) {
      ask(cfg.followup.message, { intent: cfg.followup.intent, displayText: cfg.followup.displayText });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 rounded-lg h-8 text-xs"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Помощник
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background">
          <SheetHeader className="px-4 py-3 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-primary" />
              AI-помощник по займу
            </SheetTitle>
            <p className="text-[11px] text-muted-foreground">
              Подсказывает, что делать. Не выполняет действий — все подтверждения вручную.
            </p>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Быстрые вопросы:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="text-[11px] px-2.5 py-1.5 rounded-md border border-border/60 hover:bg-secondary transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary/15 text-foreground'
                      : m.error
                      ? 'bg-destructive/10 text-destructive border border-destructive/30'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {m.error && <AlertCircle className="w-3 h-3 inline mr-1" />}
                  {m.content}
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
                      {m.actions.map((a) => {
                        const cfg = ACTION_LABELS[a];
                        if (!cfg) return null;
                        return (
                          <button
                            key={a}
                            onClick={() => handleAction(a)}
                            className="text-[10px] px-2 py-1 rounded border border-border/60 hover:bg-background transition-colors"
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Думаю…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              placeholder="Спросите о займе…"
              disabled={loading}
              className="rounded-lg h-9 text-xs"
            />
            <Button
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}
              size="sm"
              className="rounded-lg h-9 gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
