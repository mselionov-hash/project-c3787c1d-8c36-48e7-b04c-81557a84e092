import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import logoSquare from '@/assets/logo-square.png';
import { Button } from '@/components/ui/button';

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setStatus('error');
      setErrorMsg('Отсутствуют параметры подтверждения.');
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (type === 'signup' || type === 'email') {
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(async ({ error }) => {
            if (error) {
              setStatus('error');
              setErrorMsg(error.message);
            } else {
              // Sign out so the user must log in manually
              await supabase.auth.signOut();
              setStatus('success');
            }
          });
      } else {
        setStatus('error');
        setErrorMsg('Недействительная ссылка подтверждения.');
      }
    } else if (type === 'recovery') {
      navigate(`/reset-password${hash}`);
    } else {
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(async ({ error }) => {
            if (error) {
              setStatus('error');
              setErrorMsg(error.message);
            } else {
              await supabase.auth.signOut();
              setStatus('success');
            }
          });
      } else {
        setStatus('error');
        setErrorMsg('Неизвестный тип подтверждения.');
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <img src={logoSquare} alt="ГдеДеньги" className="w-24 h-24 rounded-2xl mx-auto mb-2" />
        <h1 className="text-2xl font-bold font-display">ГдеДеньги</h1>

        {status === 'loading' && (
          <div className="card-elevated p-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Подтверждаем ваш email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="card-elevated p-8 space-y-4">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <div>
              <h2 className="text-lg font-semibold mb-1">Email подтверждён</h2>
              <p className="text-sm text-muted-foreground">
                Ваш аккаунт успешно подтверждён. Теперь вы можете войти в сервис.
              </p>
            </div>
            <Button onClick={() => navigate('/auth')} className="w-full rounded-xl h-11 gap-2">
              Войти в аккаунт
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="card-elevated p-8 space-y-4">
            <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
            <div>
              <h2 className="text-lg font-semibold mb-1">Ошибка подтверждения</h2>
              <p className="text-sm text-muted-foreground">
                {errorMsg || 'Ссылка недействительна или устарела.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/auth')} className="w-full rounded-xl h-11">
              Вернуться к авторизации
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthConfirm;
