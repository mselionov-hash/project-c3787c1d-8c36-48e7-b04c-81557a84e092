import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { LoanCard } from '@/components/LoanCard';
import { Button } from '@/components/ui/button';
import { Plus, Send, CheckCircle2, Clock, Wallet } from 'lucide-react';
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
      .order('created_at', { ascending: false });
    setLoans(data || []);
    setLoadingLoans(false);
  };

  if (loading || !user) return null;

  const displayName = profile?.full_name?.split(' ')[0] || 'Пользователь';

  // Categorize loans
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

  const issuedLoans = loans.filter(l => l.lender_id === user.id);
  const totalIssued = issuedLoans.reduce((s, l) => s + Number(l.amount), 0);
  const takenLoans = loans.filter(l => l.borrower_id === user.id);
  const totalTaken = takenLoans.reduce((s, l) => s + Number(l.amount), 0);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">{displayName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Обзор ваших займов</p>
          </div>
          <Button onClick={() => navigate('/loans/create')} className="gap-2 rounded-lg h-9 text-xs" size="sm">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Новый займ</span>
            <span className="sm:hidden">Создать</span>
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="card-elevated p-4">
            <p className="stat-label mb-1">Договоров</p>
            <p className="text-2xl font-bold font-display">{loans.length}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="stat-label mb-1">Выдано</p>
            <p className="text-2xl font-bold font-display text-primary">{totalIssued > 0 ? `${(totalIssued / 1000).toFixed(0)}K` : '0'}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="stat-label mb-1">Получено</p>
            <p className="text-2xl font-bold font-display">{totalTaken > 0 ? `${(totalTaken / 1000).toFixed(0)}K` : '0'}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5 flex-shrink-0" onClick={() => navigate('/loans/create')}>
            <Plus className="w-3.5 h-3.5" />
            Новый займ
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5 flex-shrink-0"
            onClick={() => {
              const active = loans.find(l => l.lender_id === user.id && ['fully_signed', 'active'].includes(l.status));
              if (active) navigate(`/loans/${active.id}`);
              else toast_noop();
            }}>
            <Send className="w-3.5 h-3.5" />
            Выдать транш
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5 flex-shrink-0"
            onClick={() => {
              const active = loans.find(l => l.borrower_id === user.id && l.status === 'active');
              if (active) navigate(`/loans/${active.id}`);
              else toast_noop();
            }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Погасить
          </Button>
        </div>

        {loadingLoans ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Загрузка...</div>
        ) : loans.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold font-display mb-1">Нет займов</p>
            <p className="text-sm text-muted-foreground mb-5">Создайте первый договор займа</p>
            <Button onClick={() => navigate('/loans/create')} className="gap-2 rounded-lg text-xs">
              <Plus className="w-3.5 h-3.5" />
              Создать
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Awaiting action */}
            {awaitingAction.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-warning" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ожидает действия</h2>
                </div>
                <div className="space-y-2">
                  {awaitingAction.map(loan => (
                    <LoanCard key={loan.id} loan={loan} type={loan.lender_id === user.id ? 'issued' : 'taken'} />
                  ))}
                </div>
              </section>
            )}

            {/* Active loans */}
            {activeLoans.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Активные</h2>
                <div className="space-y-2">
                  {activeLoans.map(loan => (
                    <LoanCard key={loan.id} loan={loan} type={loan.lender_id === user.id ? 'issued' : 'taken'} />
                  ))}
                </div>
              </section>
            )}

            {/* Soon due */}
            {soonDue.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-warning uppercase tracking-wider mb-3">Скоро срок</h2>
                <div className="space-y-2">
                  {soonDue.map(loan => (
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

function toast_noop() {
  // Intentional no-op for quick actions with no matching loan
}

export default Dashboard;
