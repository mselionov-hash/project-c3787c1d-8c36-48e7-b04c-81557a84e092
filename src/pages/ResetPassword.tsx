import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, AlertTriangle, Loader2, Lock } from 'lucide-react';
import logoSquare from '@/assets/logo-square.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setPhase('error');
      setErrorMsg('Отсутствуют параметры восстановления.');
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (type !== 'recovery' || !accessToken || !refreshToken) {
      setPhase('error');
      setErrorMsg('Недействительная или устаревшая ссылка восстановления.');
      return;
    }

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setPhase('error');
          setErrorMsg('Ссылка устарела. Запросите восстановление повторно.');
        } else {
          setPhase('form');
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }
    if (password !== confirm) {
      toast.error('Пароли не совпадают');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
    } else {
      setPhase('success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <img src={logoSquare} alt="ГдеДеньги" className="w-16 h-16 rounded-2xl mx-auto mb-2" />
        <h1 className="text-2xl font-bold font-display">ГдеДеньги</h1>

        {phase === 'loading' && (
          <div className="card-elevated p-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Проверяем ссылку...</p>
          </div>
        )}

        {phase === 'form' && (
          <div className="card-elevated p-6 space-y-5 text-left">
            <div className="text-center">
              <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
              <h2 className="text-lg font-semibold">Новый пароль</h2>
              <p className="text-sm text-muted-foreground mt-1">Введите новый пароль для вашего аккаунта</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Новый пароль</Label>
                <Input id="new-password" type="password" placeholder="Минимум 6 символов" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl bg-muted/50 border-border/50 focus:bg-card" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Подтвердите пароль</Label>
                <Input id="confirm-password" type="password" placeholder="Повторите пароль" value={confirm} onChange={e => setConfirm(e.target.value)} className="h-12 rounded-xl bg-muted/50 border-border/50 focus:bg-card" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl text-sm font-semibold gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Сохранить пароль
              </Button>
            </form>
          </div>
        )}

        {phase === 'success' && (
          <div className="card-elevated p-8 space-y-4">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <div>
              <h2 className="text-lg font-semibold mb-1">Пароль обновлён</h2>
              <p className="text-sm text-muted-foreground">Вы можете войти с новым паролем.</p>
            </div>
            <Button onClick={() => navigate('/dashboard')} className="w-full rounded-xl h-11 gap-2">
              Перейти в личный кабинет
            </Button>
          </div>
        )}

        {phase === 'error' && (
          <div className="card-elevated p-8 space-y-4">
            <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
            <div>
              <h2 className="text-lg font-semibold mb-1">Ошибка</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
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

export default ResetPassword;
