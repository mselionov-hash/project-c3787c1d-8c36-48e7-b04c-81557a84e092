import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { LoanCard } from '@/components/LoanCard';
import { Button } from '@/components/ui/button';
import { Plus, Send, CheckCircle2, Clock, Wallet, AlertTriangle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
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
      .order('updated_at', { ascending: false });
    setLoans(data || []);
    setLoadingLoans(false);
  };

  if (loading || !user) return null;

  const displayName = profile?.full_name?.split(' ')[0] || 'Пользователь';

  // Awaiting user's action
  const awaitingAction = loans.filter(l => {
    const isLender = l.lender_id === user.id;
    const isBorrower = l.borrower_id === user.id;
    if (l.status === 'draft' && isLender) return true;
    if (l.status === 'awaiting_signatures') return true;
    if (l.status === 'signed_by_lender' && isBorrower) return true;
    if (l.status === 'signed_by_borrower' && isLender) return true;
    return false;
  });

  const activeLoans = loans.filter(l => ['active', 'fully_signed'].includes(l.status));

  const soonDue = activeLoans.filter(l => {
    const days = Math.ceil((new Date(l.repayment_date).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 30;
  });

  const overdue = loans.filter(l => {
    if (l.status !== 'active') return false;
    return new Date(l.repayment_date).getTime() < Date.now();
  });

  // Recently updated (last 7 days, excluding those already in awaiting/active)
  const awaitingIds = new Set(awaitingAction.map(l => l.id));
  const activeIds = new Set(activeLoans.map(l => l.id));
  const weekAgo = Date.now() - 7 * 86400000;
  const recentlyUpdated = loans.filter(l =>
    !awaitingIds.has(l.id) &&
    !activeIds.has(l.id) &&
    new Date(l.updated_at).getTime() > weekAgo
  ).slice(0, 5);

  // Stats
  const issuedLoans = loans.filter(l => l.lender_id === user.id);
  const totalIssued = issuedLoans.reduce((s, l) => s + Number(l.amount), 0);
  const takenLoans = loans.filter(l => l.borrower_id === user.id);
  const totalTaken = takenLoans.reduce((s, l) => s + Number(l.amount), 0);

  const findActiveLoan = (role: 'lender' | 'borrower') => {
    const key = role === 'lender' ? 'lender_id' : 'borrower_id';
    return loans.find(l => l[key] === user.id && ['fully_signed', 'active'].includes(l.status));
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">Привет, {displayName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {awaitingAction.length > 0
                ? `${awaitingAction.length} ${awaitingAction.length === 1 ? 'действие ожидает' : 'действий ожидают'} вас`
                : 'Всё под контролем'}
            </p>
          </div>
          <Button onClick={() => navigate('/loans/create')} className="gap-1.5 rounded-lg h-8 text-xs" size="sm">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Новый займ</span>
            <span className="sm:hidden">Создать</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="card-elevated p-3">
            <p className="stat-label">Договоров</p>
            <p className="text-xl font-bold font-display mt-0.5">{loans.length}</p>
          </div>
          <div className="card-elevated p-3">
            <p className="stat-label">Выдано</p>
            <p className="text-xl font-bold font-display text-primary mt-0.5">
              {totalIssued > 0 ? `${(totalIssued / 1000).toFixed(0)}K` : '0'}
            </p>
          </div>
          <div className="card-elevated p-3">
            <p className="stat-label">Получено</p>
            <p className="text-xl font-bold font-display mt-0.5">
              {totalTaken > 0 ? `${(totalTaken / 1000).toFixed(0)}K` : '0'}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5 flex-shrink-0 h-8" onClick={() => navigate('/loans/create')}>
            <Plus className="w-3.5 h-3.5" />
            Новый займ
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5 flex-shrink-0 h-8"
            onClick={() => {
              const loan = findActiveLoan('lender');
              if (loan) navigate(`/loans/${loan.id}`);
            }}>
            <Send className="w-3.5 h-3.5" />
            Выдать транш
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5 flex-shrink-0 h-8"
            onClick={() => {
              const loan = loans.find(l => l.borrower_id === user.id && l.status === 'active');
              if (loan) navigate(`/loans/${loan.id}`);
            }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Погасить
          </Button>
        </div>

        {loadingLoans ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Загрузка...</div>
        ) : loans.length === 0 ? (
          <div className="card-elevated p-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold font-display mb-1">Нет займов</p>
            <p className="text-xs text-muted-foreground mb-4">Создайте первый договор займа</p>
            <Button onClick={() => navigate('/loans/create')} className="gap-1.5 rounded-lg text-xs h-8" size="sm">
              <Plus className="w-3.5 h-3.5" />
              Создать
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Overdue */}
            {overdue.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider">Просрочено</h2>
                </div>
                <div className="space-y-1.5">
                  {overdue.map(loan => (
                    <LoanCard key={loan.id} loan={loan} type={loan.lender_id === user.id ? 'issued' : 'taken'} />
                  ))}
                </div>
              </section>
            )}

            {/* Awaiting action */}
            {awaitingAction.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-warning" />
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ожидает действия</h2>
                </div>
                <div className="space-y-1.5">
                  {awaitingAction.map(loan => (
                    <LoanCard key={loan.id} loan={loan} type={loan.lender_id === user.id ? 'issued' : 'taken'} />
                  ))}
                </div>
              </section>
            )}

            {/* Active */}
            {activeLoans.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Активные</h2>
                <div className="space-y-1.5">
                  {activeLoans.map(loan => (
                    <LoanCard key={loan.id} loan={loan} type={loan.lender_id === user.id ? 'issued' : 'taken'} />
                  ))}
                </div>
              </section>
            )}

            {/* Soon due */}
            {soonDue.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">Скоро срок</h2>
                <div className="space-y-1.5">
                  {soonDue.map(loan => (
                    <LoanCard key={loan.id} loan={loan} type={loan.lender_id === user.id ? 'issued' : 'taken'} />
                  ))}
                </div>
              </section>
            )}

            {/* Recently updated */}
            {recentlyUpdated.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Недавно обновлённые</h2>
                <div className="space-y-1.5">
                  {recentlyUpdated.map(loan => (
                    <LoanCard key={loan.id} loan={loan} type={loan.lender_id === user.id ? 'issued' : 'taken'} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
