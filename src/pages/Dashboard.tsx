import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser, getUserLoansAsLender, getUserLoansAsBorrower } from '@/lib/store';
import LoanCard from '@/components/LoanCard';
import CreateLoanForm from '@/components/CreateLoanForm';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, ArrowUpRight, ArrowDownLeft, Landmark, Wallet } from 'lucide-react';
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
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Landmark className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">P2P Займы</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card-glass p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="stat-label">Всего договоров</span>
            </div>
            <div className="stat-value">{issuedLoans.length + takenLoans.length}</div>
          </div>
          <div className="card-glass p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-accent" />
              <span className="stat-label">Выдано</span>
            </div>
            <div className="stat-value text-accent">{totalIssued.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="card-glass p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownLeft className="w-4 h-4 text-primary" />
              <span className="stat-label">Получено</span>
            </div>
            <div className="stat-value">{totalTaken.toLocaleString('ru-RU')} ₽</div>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Мои займы</h2>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Новый договор
          </Button>
        </div>

        {/* Loans issued */}
        {issuedLoans.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Выданные займы
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issuedLoans.map(loan => (
                <LoanCard key={loan.id} loan={loan} type="issued" />
              ))}
            </div>
          </div>
        )}

        {/* Loans taken */}
        {takenLoans.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Полученные займы
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {takenLoans.map(loan => (
                <LoanCard key={loan.id} loan={loan} type="taken" />
              ))}
            </div>
          </div>
        )}

        {issuedLoans.length === 0 && takenLoans.length === 0 && (
          <div className="card-glass p-12 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-1">У вас пока нет займов</p>
            <p className="text-sm text-muted-foreground">Создайте свой первый договор займа</p>
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
