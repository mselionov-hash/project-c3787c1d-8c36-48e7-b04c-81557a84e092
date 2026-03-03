import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser, getUserLoansAsLender, getUserLoansAsBorrower } from '@/lib/store';
import LoanCard from '@/components/LoanCard';
import CreateLoanForm from '@/components/CreateLoanForm';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, ArrowUpRight, ArrowDownLeft, Wallet, FileText, TrendingUp } from 'lucide-react';
import { useEffect } from 'react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  if (!user) return null;

  const issuedLoans = getUserLoansAsLender(user.name);
  const takenLoans = getUserLoansAsBorrower(user.name);

  const totalIssued = issuedLoans.reduce((s, l) => s + l.amount, 0);
  const totalTaken = takenLoans.reduce((s, l) => s + l.amount, 0);

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-background" key={refreshKey}>
      {/* Header */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg font-display">P2P Займы</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <button onClick={handleLogout} className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display">Добрый день, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground mt-1">Вот обзор ваших займов</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          <div className="card-elevated p-6 group hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Всего договоров</span>
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="stat-value">{issuedLoans.length + takenLoans.length}</div>
            <p className="text-xs text-muted-foreground mt-1">активных договоров</p>
          </div>
          <div className="card-elevated p-6 group hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">Выдано</span>
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="stat-value text-accent">{totalIssued.toLocaleString('ru-RU')} ₽</div>
            <p className="text-xs text-muted-foreground mt-1">{issuedLoans.length} займов выдано</p>
          </div>
          <div className="card-elevated p-6 group hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] transition-shadow">
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-display">Мои займы</h2>
          <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl h-11 px-5">
            <Plus className="w-4 h-4" />
            Новый договор
          </Button>
        </div>

        {/* Loans issued */}
        {issuedLoans.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 rounded-full bg-accent" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Выданные займы
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {issuedLoans.map(loan => (
                <LoanCard key={loan.id} loan={loan} type="issued" />
              ))}
            </div>
          </div>
        )}

        {/* Loans taken */}
        {takenLoans.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Полученные займы
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {takenLoans.map(loan => (
                <LoanCard key={loan.id} loan={loan} type="taken" />
              ))}
            </div>
          </div>
        )}

        {issuedLoans.length === 0 && takenLoans.length === 0 && (
          <div className="card-elevated p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold font-display mb-1">У вас пока нет займов</p>
            <p className="text-sm text-muted-foreground mb-6">Создайте свой первый договор займа</p>
            <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Создать договор
            </Button>
          </div>
        )}
      </main>

      {showForm && (
        <CreateLoanForm
          currentUserName={user.name}
          onClose={() => setShowForm(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
};

export default Dashboard;
