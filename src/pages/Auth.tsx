import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveUser, findUser, setCurrentUser, getUsers } from '@/lib/store';
import { toast } from 'sonner';
import { ArrowRight, Landmark } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Landmark className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">P2P Займы</h1>
          <p className="text-muted-foreground mt-1">Займы между физическими лицами</p>
        </div>

        <div className="card-glass p-6">
          <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                isLogin ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                !isLogin ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  placeholder="Иван Иванов"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ivan@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
