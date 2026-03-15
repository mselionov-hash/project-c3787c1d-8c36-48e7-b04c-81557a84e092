import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, ArrowUpRight, ArrowDownLeft, Wallet, FileText, TrendingUp, Eye, UserCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;

const statusLabels: Record<string, { label: string; class: string }> = {
  draft: { label: 'Черновик', class: 'bg-muted text-muted-foreground' },
  awaiting_signatures: { label: 'Ожидает подписей', class: 'bg-warning/10 text-warning' },
  signed_by_lender: { label: 'Подписан займодавцем', class: 'bg-primary/10 text-primary' },
  signed_by_borrower: { label: 'Подписан заёмщиком', class: 'bg-primary/10 text-primary' },
  fully_signed: { label: 'Полностью подписан', class: 'bg-accent/10 text-accent' },
  active: { label: 'Активный', class: 'bg-accent/10 text-accent' },
  repaid: { label: 'Погашён', class: 'bg-muted text-muted-foreground' },
  overdue: { label: 'Просрочен', class: 'bg-destructive/10 text-destructive' },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    const { data } = await supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });
    setLoans(data || []);
    setLoadingLoans(false);
  };

  if (loading || !user) return null;

  const issuedLoans = loans.filter(l => l.lender_id === user.id);
  const takenLoans = loans.filter(l => l.borrower_id === user.id);
  const totalIssued = issuedLoans.reduce((s, l) => s + Number(l.amount), 0);
  const totalTaken = takenLoans.reduce((s, l) => s + Number(l.amount), 0);
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Пользователь';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base sm:text-lg font-display">P2P Займы</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm font-medium">{displayName}</span>
            </div>
            <button onClick={() => navigate('/profile')} className="p-2 sm:p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Профиль">
              <UserCircle className="w-5 h-5" />
            </button>
            <button onClick={signOut} className="p-2 sm:p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Выйти">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold font-display">Добрый день, {displayName.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground mt-1 text-sm">Вот обзор ваших займов</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-10">
          <div className="card-elevated p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Всего договоров</span>
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="stat-value">{loans.length}</div>
            <p className="text-xs text-muted-foreground mt-1">договоров</p>
          </div>
          <div className="card-elevated p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Выдано</span>
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="stat-value text-accent">{totalIssued.toLocaleString('ru-RU')} ₽</div>
            <p className="text-xs text-muted-foreground mt-1">{issuedLoans.length} займов выдано</p>
          </div>
          <div className="card-elevated p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Получено</span>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="stat-value">{totalTaken.toLocaleString('ru-RU')} ₽</div>
            <p className="text-xs text-muted-foreground mt-1">{takenLoans.length} займов получено</p>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold font-display">Мои займы</h2>
          <Button onClick={() => navigate('/loans/create')} className="gap-2 rounded-xl h-10 sm:h-11 px-4 sm:px-5 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Новый договор</span>
            <span className="sm:hidden">Создать</span>
          </Button>
        </div>

        {/* Loans list */}
        {loadingLoans ? (
          <div className="text-center py-16 text-muted-foreground">Загрузка...</div>
        ) : loans.length === 0 ? (
          <div className="card-elevated p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold font-display mb-1">У вас пока нет займов</p>
            <p className="text-sm text-muted-foreground mb-6">Создайте свой первый договор займа</p>
            <Button onClick={() => navigate('/loans/create')} variant="outline" className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Создать договор
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {issuedLoans.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 rounded-full bg-accent" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Выданные займы</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {issuedLoans.map(loan => (
                    <LoanCardItem key={loan.id} loan={loan} type="issued" />
                  ))}
                </div>
              </div>
            )}
            {takenLoans.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 rounded-full bg-primary" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Полученные займы</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {takenLoans.map(loan => (
                    <LoanCardItem key={loan.id} loan={loan} type="taken" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const LoanCardItem = ({ loan, type }: { loan: Tables<'loans'>; type: 'issued' | 'taken' }) => {
  const navigate = useNavigate();
  const status = statusLabels[loan.status] || statusLabels.draft;

  return (
    <div
      onClick={() => navigate(`/loans/${loan.id}`)}
      className="card-elevated p-6 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            type === 'issued' ? 'bg-accent/10 group-hover:bg-accent/15' : 'bg-primary/10 group-hover:bg-primary/15'
          }`}>
            {type === 'issued'
              ? <ArrowUpRight className="w-5 h-5 text-accent" />
              : <ArrowDownLeft className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{type === 'issued' ? loan.borrower_name : loan.lender_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{type === 'issued' ? 'Заёмщик' : 'Займодавец'}</p>
          </div>
        </div>
        <span className={`pill-badge ${status.class}`}>{status.label}</span>
      </div>
      <div className="stat-value mb-1">{Number(loan.amount).toLocaleString('ru-RU')} ₽</div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{Number(loan.interest_rate)}%</span>
          <span>до {new Date(loan.repayment_date).toLocaleDateString('ru-RU')}</span>
        </div>
        <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

export default Dashboard;
