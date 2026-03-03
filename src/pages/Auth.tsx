import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveUser, findUser, setCurrentUser, getUsers } from '@/lib/store';
import { toast } from 'sonner';
import { ArrowRight, Shield, TrendingUp, Users } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      const user = getUsers().find(u => u.email === email);
      if (!user) {
        toast.error('Пользователь не найден');
        return;
      }
      setCurrentUser(user);
      toast.success('Добро пожаловать!');
      navigate('/');
    } else {
      if (!name.trim() || !email.trim()) {
        toast.error('Заполните все поля');
        return;
      }
      if (findUser(email)) {
        toast.error('Пользователь с таким email уже существует');
        return;
      }
      const user = { id: crypto.randomUUID(), name: name.trim(), email: email.trim() };
      saveUser(user);
      setCurrentUser(user);
      toast.success('Регистрация успешна!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - branding */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold text-primary-foreground mb-4 font-display">
            P2P Займы
          </h1>
          <p className="text-primary-foreground/70 text-lg mb-10 leading-relaxed">
            Современная платформа для оформления займов между физическими лицами с автоматической генерацией документов.
          </p>
          <div className="space-y-5">
            {[
              { icon: Shield, text: 'Юридически корректные договоры' },
              { icon: TrendingUp, text: 'Отслеживание всех займов' },
              { icon: Users, text: 'Простое управление контрагентами' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary-foreground/80" />
                </div>
                <span className="text-primary-foreground/80 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-display">P2P Займы</h1>
            <p className="text-muted-foreground mt-1">Займы между физическими лицами</p>
          </div>

          <div className="hidden lg:block mb-10">
            <h2 className="text-2xl font-bold font-display">
              {isLogin ? 'Войти в аккаунт' : 'Создать аккаунт'}
            </h2>
            <p className="text-muted-foreground mt-1.5">
              {isLogin ? 'Введите ваш email для входа' : 'Заполните данные для регистрации'}
            </p>
          </div>

          <div className="card-elevated p-7">
            <div className="flex gap-1 p-1 rounded-xl bg-muted mb-7">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  isLogin ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Вход
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  !isLogin ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Имя</Label>
                  <Input
                    id="name"
                    placeholder="Иван Иванов"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-border/50 focus:bg-card"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ivan@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-border/50 focus:bg-card"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl gap-2 text-sm font-semibold">
                {isLogin ? 'Войти' : 'Зарегистрироваться'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Создавая аккаунт, вы соглашаетесь с условиями использования
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
