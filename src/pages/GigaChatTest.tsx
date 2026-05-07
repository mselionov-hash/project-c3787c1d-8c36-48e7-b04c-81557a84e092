import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const readFunctionError = async (error: any, fallbackData: any) => {
  const response = error?.context;
  if (response instanceof Response) {
    const text = await response.clone().text();
    try {
      return {
        ok: false,
        httpStatus: response.status,
        ...JSON.parse(text),
      };
    } catch {
      return {
        ok: false,
        httpStatus: response.status,
        error: text || error.message,
      };
    }
  }

  return { ok: false, error: error?.message ?? 'Неизвестная ошибка', data: fallbackData };
};

const GigaChatTest = () => {
  const { user, loading } = useAuth();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('Привет, проверь подключение');
  const [result, setResult] = useState<any>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('gigachat-test', {
        body: { message },
      });
      setResult(error ? await readFunctionError(error, data) : data);
    } catch (e: any) {
      setResult({ ok: false, error: e.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold font-display mb-2">Тест подключения GigaChat</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Запрос идёт через защищённый AI-прокси ГдеДеньги в РФ. Учётные данные GigaChat не покидают прокси.
        </p>

        <div className="space-y-3 mb-4">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Сообщение для GigaChat"
            disabled={running}
            className="rounded-lg"
          />
          <Button onClick={run} disabled={running || !message.trim()} className="rounded-lg gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Отправить запрос
          </Button>
        </div>

        {result && (
          <div className="card-elevated p-5 mt-6 space-y-3">
            <div className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <span className="font-semibold">
                {result.ok ? 'Ответ получен' : `Ошибка${result.stage ? ` (${result.stage})` : ''}`}
              </span>
            </div>
            {result.ok && result.answer && (
              <div className="text-sm whitespace-pre-wrap">
                <span className="text-muted-foreground">Ответ модели: </span>
                <span className="font-medium">{result.answer}</span>
              </div>
            )}
            <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-auto max-h-80">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default GigaChatTest;
