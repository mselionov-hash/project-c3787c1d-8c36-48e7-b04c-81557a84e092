import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { LoanCard } from '@/components/LoanCard';
import { Button } from '@/components/ui/button';
import { Plus, Send, CheckCircle2, Clock, Wallet, AlertTriangle, CreditCard, Banknote } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type Tranche = Tables<'loan_tranches'>;
type Payment = Tables<'loan_payments'>;

interface LoanWithPending extends Loan {
  hasPendingTranches?: boolean;
  hasPendingPayments?: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [loans, setLoans] = useState<LoanWithPending[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    const [loansRes, tranchesRes, paymentsRes] = await Promise.all([
      supabase.from('loans').select('*').order('updated_at', { ascending: false }),
      supabase.from('loan_tranches').select('loan_id, status').in('status', ['sent', 'planned']),
      supabase.from('loan_payments').select('loan_id, status').eq('status', 'pending'),
    ]);

    const rawLoans = loansRes.data || [];
    const pendingTrancheLoans = new Set((tranchesRes.data || []).filter(t => t.status === 'sent').map(t => t.loan_id));
    const pendingPaymentLoans = new Set((paymentsRes.data || []).map(p => p.loan_id));

    const enriched: LoanWithPending[] = rawLoans.map(l => ({
      ...l,
      hasPendingTranches: pendingTrancheLoans.has(l.id),
      hasPendingPayments: pendingPaymentLoans.has(l.id),
    }));

    setLoans(enriched);
    setLoadingLoans(false);
  };

  if (loading || !user) return null;

  const displayName = profile?.full_name?.split(' ')[0] || 'Пользователь';

  // --- Categorize loans by operational status ---
  const isLender = (l: Loan) => l.lender_id === user.id;
  const isBorrower = (l: Loan) => l.borrower_id === user.id;

  // Overdue
  const overdue = loans.filter(l =>
    l.status === 'active' && new Date(l.repayment_date).getTime() < Date.now()
  );

  // Awaiting signature
  const awaitingSignature = loans.filter(l => {
    if (l.status === 'awaiting_signatures') return true;
    if (l.status === 'signed_by_lender' && isBorrower(l)) return true;
    if (l.status === 'signed_by_borrower' && isLender(l)) return true;
    return false;
  });

  // Awaiting requisites selection (signed but needs bank details setup)
  const awaitingRequisites = loans.filter(l =>
    l.status === 'fully_signed'
  );

  // Awaiting tranche from lender (signed_no_debt, lender's turn)
  const awaitingTranche = loans.filter(l =>
    l.status === 'signed_no_debt' && isLender(l)
  );

  // Awaiting tranche confirmation (borrower needs to confirm)
  const awaitingTrancheConfirm = loans.filter(l =>
    l.hasPendingTranches && isBorrower(l) && ['active', 'signed_no_debt'].includes(l.status)
  );

  // Awaiting repayment (borrower's turn)
  const awaitingRepayment = loans.filter(l =>
    l.status === 'active' && isBorrower(l) && !overdue.some(o => o.id === l.id)
  );

  // Awaiting repayment confirmation (lender needs to confirm)
  const awaitingRepaymentConfirm = loans.filter(l =>
    l.hasPendingPayments && isLender(l)
  );

  // Active (not in other categories)
  const categorizedIds = new Set([
    ...overdue, ...awaitingSignature, ...awaitingRequisites,
    ...awaitingTranche, ...awaitingTrancheConfirm,
    ...awaitingRepayment, ...awaitingRepaymentConfirm,
  ].map(l => l.id));

  const activeLoans = loans.filter(l =>
    ['active', 'fully_signed', 'signed_no_debt'].includes(l.status) && !categorizedIds.has(l.id)
  );

  // Drafts
  const drafts = loans.filter(l => l.status === 'draft' && isLender(l));

  // Completed
  const completed = loans.filter(l => l.status === 'repaid');

  // Count all action items
  const actionCount = overdue.length + awaitingSignature.length + awaitingRequisites.length +
    awaitingTranche.length + awaitingTrancheConfirm.length + awaitingRepaymentConfirm.length;

  // Stats
  const issuedLoans = loans.filter(l => l.lender_id === user.id);
  const totalIssued = issuedLoans.reduce((s, l) => s + Number(l.amount), 0);
  const takenLoans = loans.filter(l => l.borrower_id === user.id);
  const totalTaken = takenLoans.reduce((s, l) => s + Number(l.amount), 0);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">Привет, {displayName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {actionCount > 0
                ? `${actionCount} ${actionCount === 1 ? 'действие ожидает' : 'действий ожидают'} вас`
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
              const loan = loans.find(l => l.lender_id === user.id && ['fully_signed', 'active', 'signed_no_debt'].includes(l.status));
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
            <DashboardSection
              loans={overdue}
              userId={user.id}
              icon={<AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
              title="Просрочено"
              titleClass="text-destructive"
            />

            {/* Awaiting signature */}
            <DashboardSection
              loans={awaitingSignature}
              userId={user.id}
              icon={<Clock className="w-3.5 h-3.5 text-warning" />}
              title="Ожидает подписания"
            />

            {/* Awaiting requisites */}
            <DashboardSection
              loans={awaitingRequisites}
              userId={user.id}
              icon={<CreditCard className="w-3.5 h-3.5 text-warning" />}
              title="Ожидает выбора реквизитов"
            />

            {/* Awaiting tranche */}
            <DashboardSection
              loans={awaitingTranche}
              userId={user.id}
              icon={<Banknote className="w-3.5 h-3.5 text-primary" />}
              title="Ожидает выдачи транша"
            />

            {/* Awaiting tranche confirmation */}
            <DashboardSection
              loans={awaitingTrancheConfirm}
              userId={user.id}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-info" />}
              title="Ожидает подтверждения транша"
            />

            {/* Awaiting repayment confirmation */}
            <DashboardSection
              loans={awaitingRepaymentConfirm}
              userId={user.id}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-info" />}
              title="Ожидает подтверждения погашения"
            />

            {/* Awaiting repayment */}
            <DashboardSection
              loans={awaitingRepayment}
              userId={user.id}
              icon={<Banknote className="w-3.5 h-3.5 text-primary" />}
              title="Активные (ожидает погашения)"
            />

            {/* Other active */}
            <DashboardSection
              loans={activeLoans}
              userId={user.id}
              title="Активные"
            />

            {/* Drafts */}
            <DashboardSection
              loans={drafts}
              userId={user.id}
              title="Черновики"
            />

            {/* Completed */}
            <DashboardSection
              loans={completed}
              userId={user.id}
              title="Погашённые"
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const DashboardSection = ({ loans, userId, icon, title, titleClass }: {
  loans: LoanWithPending[];
  userId: string;
  icon?: React.ReactNode;
  title: string;
  titleClass?: string;
}) => {
  if (loans.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${titleClass || 'text-muted-foreground'}`}>{title}</h2>
        <span className="text-[10px] text-muted-foreground">({loans.length})</span>
      </div>
      <div className="space-y-1.5">
        {loans.map(loan => (
          <LoanCard key={loan.id} loan={loan} type={loan.lender_id === userId ? 'issued' : 'taken'} />
        ))}
      </div>
    </section>
  );
};

export default Dashboard;
