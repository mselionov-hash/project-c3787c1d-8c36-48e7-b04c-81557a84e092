import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { LoanCard } from '@/components/LoanCard';
import { Button } from '@/components/ui/button';
import { Plus, Send, CheckCircle2, Clock, Wallet, AlertTriangle, CreditCard, Banknote, FileEdit, Archive } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { calculateLoanTotals, isLoanOverdue, overdueDays } from '@/lib/loan-status';
import { getLoanOperationalState, type OperationalState, type BankReadiness } from '@/lib/loan-next-action';

type Loan = Tables<'loans'>;
type Tranche = Tables<'loan_tranches'>;
type Payment = Tables<'loan_payments'>;
type Signature = Tables<'loan_signatures'>;
type AllowedBank = Tables<'loan_allowed_bank_details'>;

interface LoanWithPending extends Loan {
  isOverdue?: boolean;
  daysOverdue?: number;
  outstanding?: number;
  opState?: OperationalState;
}

const DEV_DEBUG = (import.meta as any).env?.DEV === true;

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
    const [loansRes, tranchesRes, paymentsRes, sigsRes, allowedRes] = await Promise.all([
      // Exclude archived loans by default
      supabase.from('loans').select('*').is('archived_at', null).order('updated_at', { ascending: false }),
      supabase.from('loan_tranches').select('loan_id, amount, status, tranche_number'),
      supabase.from('loan_payments').select('loan_id, transfer_amount, status'),
      supabase.from('loan_signatures').select('loan_id, role'),
      supabase.from('loan_allowed_bank_details').select('loan_id, party_role, purpose'),
    ]);

    const rawLoans = loansRes.data || [];
    const allTranches = tranchesRes.data || [];
    const allPayments = paymentsRes.data || [];
    const allSigs = (sigsRes.data || []) as Array<Pick<Signature, 'role'> & { loan_id: string }>;
    const allAllowed = (allowedRes.data || []) as Array<Pick<AllowedBank, 'party_role' | 'purpose'> & { loan_id: string }>;

    const tranchesByLoan = new Map<string, Pick<Tranche, 'amount' | 'status' | 'tranche_number'>[]>();
    for (const t of allTranches) {
      const arr = tranchesByLoan.get(t.loan_id) || [];
      arr.push(t as any);
      tranchesByLoan.set(t.loan_id, arr);
    }
    const paymentsByLoan = new Map<string, Pick<Payment, 'transfer_amount' | 'status'>[]>();
    for (const p of allPayments) {
      const arr = paymentsByLoan.get(p.loan_id) || [];
      arr.push(p as any);
      paymentsByLoan.set(p.loan_id, arr);
    }
    const sigsByLoan = new Map<string, Pick<Signature, 'role'>[]>();
    for (const s of allSigs) {
      const arr = sigsByLoan.get(s.loan_id) || [];
      arr.push({ role: s.role });
      sigsByLoan.set(s.loan_id, arr);
    }
    const allowedByLoan = new Map<string, Array<Pick<AllowedBank, 'party_role' | 'purpose'>>>();
    for (const a of allAllowed) {
      const arr = allowedByLoan.get(a.loan_id) || [];
      arr.push({ party_role: a.party_role, purpose: a.purpose });
      allowedByLoan.set(a.loan_id, arr);
    }

    const enriched: LoanWithPending[] = rawLoans.map(l => {
      const ts = tranchesByLoan.get(l.id) || [];
      const ps = paymentsByLoan.get(l.id) || [];
      const sigs = sigsByLoan.get(l.id) || [];
      const allowed = allowedByLoan.get(l.id) || [];
      const overdueFlag = isLoanOverdue(l, ts, ps);
      const totals = calculateLoanTotals(ts, ps);
      const bankReadiness: BankReadiness = {
        lenderDisbursementReady: allowed.some(a => a.party_role === 'lender' && a.purpose === 'disbursement'),
        borrowerDisbursementReady: allowed.some(a => a.party_role === 'borrower' && a.purpose === 'disbursement'),
        lenderRepaymentReady: allowed.some(a => a.party_role === 'lender' && a.purpose === 'repayment'),
        borrowerRepaymentReady: allowed.some(a => a.party_role === 'borrower' && a.purpose === 'repayment'),
      };
      const opState = getLoanOperationalState({
        loan: l, userId: user!.id, tranches: ts, payments: ps,
        bankReadiness, signatures: sigs, latestAiChecks: [],
      });
      return {
        ...l,
        isOverdue: overdueFlag,
        daysOverdue: overdueFlag ? overdueDays(l.repayment_date) : 0,
        outstanding: totals.outstanding,
        opState,
      };
    });

    setLoans(enriched);
    setLoadingLoans(false);
  };

  if (loading || !user) return null;

  const displayName = profile?.full_name?.split(' ')[0] || 'Пользователь';

  // === Bucket loans STRICTLY by opState.nextAction.id and opState.isOverdue ===
  // No more raw loan.status checks for categorization.

  const WAIT_IDS = new Set([
    'wait_lender_send',
    'wait_counterparty_signature',
    'wait_edo_counterparty',
    'wait_counterparty_bank_details',
    'wait_tranche',
    'wait_tranche_confirmation',
    'wait_repayment',
    'wait_repayment_confirmation',
    'wait_overdue_repayment',
  ]);

  // 1. Просрочено — overdue loans (regardless of priority)
  const overdue = loans.filter(l => l.opState?.isOverdue);

  const remaining = loans.filter(l => !l.opState?.isOverdue);

  // 7. Некорректные / заблокированные (self-loan etc.)
  const invalid = remaining.filter(l =>
    l.opState?.nextAction.priority === 'blocked' || l.opState?.nextAction.id === 'invalid_self_loan'
  );

  const remaining2 = remaining.filter(l => !invalid.includes(l));

  // 6. Завершённые
  const completed = remaining2.filter(l =>
    l.status === 'repaid' || l.opState?.nextAction.id === 'generate_full_repayment'
  );

  const remaining3 = remaining2.filter(l => !completed.includes(l));

  // 5. Черновики
  const drafts = remaining3.filter(l =>
    l.opState?.nextAction.id === 'send_to_borrower' || (l.status === 'draft' && l.opState?.nextAction.priority !== 'primary')
  );

  const remaining4 = remaining3.filter(l => !drafts.includes(l));

  // 2. Требует моего действия — primary actions, grouped by nextAction.id
  const myAction = remaining4.filter(l => l.opState?.nextAction.priority === 'primary');

  const myActionGroups: Record<string, LoanWithPending[]> = {};
  for (const l of myAction) {
    const id = l.opState!.nextAction.id;
    (myActionGroups[id] ||= []).push(l);
  }

  // 3. Ожидает другую сторону
  const waiting = remaining4.filter(l =>
    !myAction.includes(l) && (
      l.opState?.nextAction.priority === 'info' && WAIT_IDS.has(l.opState.nextAction.id)
    )
  );

  // 4. Активные — everything else (no urgent action, not waiting on counterparty)
  const activeLoans = remaining4.filter(l =>
    !myAction.includes(l) && !waiting.includes(l)
  );

  const actionCount = overdue.length + myAction.length + invalid.length;

  // Stats
  const issuedLoans = loans.filter(l => l.lender_id === user.id);
  const totalIssued = issuedLoans.reduce((s, l) => s + Number(l.amount), 0);
  const takenLoans = loans.filter(l => l.borrower_id === user.id);
  const totalTaken = takenLoans.reduce((s, l) => s + Number(l.amount), 0);

  // Group-action labels
  const ACTION_GROUP_LABELS: Record<string, { title: string; icon: React.ReactNode }> = {
    sign_contract: { title: 'Нужно подписать', icon: <FileEdit className="w-3.5 h-3.5 text-warning" /> },
    accept_edo: { title: 'Принять Регламент ЭДО', icon: <FileEdit className="w-3.5 h-3.5 text-warning" /> },
    choose_my_bank_details: { title: 'Выбрать реквизиты', icon: <CreditCard className="w-3.5 h-3.5 text-warning" /> },
    create_tranche: { title: 'Сделать транш', icon: <Banknote className="w-3.5 h-3.5 text-primary" /> },
    confirm_tranche: { title: 'Подтвердить транш', icon: <CheckCircle2 className="w-3.5 h-3.5 text-info" /> },
    repay_debt: { title: 'Погасить долг', icon: <Banknote className="w-3.5 h-3.5 text-primary" /> },
    repay_overdue: { title: 'Погасить задолженность', icon: <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> },
    confirm_repayment: { title: 'Подтвердить погашение', icon: <CheckCircle2 className="w-3.5 h-3.5 text-info" /> },
    fix_ai_check: { title: 'Проверить чек', icon: <AlertTriangle className="w-3.5 h-3.5 text-warning" /> },
    send_to_borrower: { title: 'Отправить заёмщику', icon: <Send className="w-3.5 h-3.5 text-primary" /> },
    wait_overdue_repayment: { title: 'Ожидаем погашение задолженности', icon: <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> },
  };

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
            {/* 1. Просрочено */}
            {overdue.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive">Просрочено</h2>
                  <span className="text-[10px] text-muted-foreground">({overdue.length})</span>
                  <span className="text-[10px] text-destructive ml-auto">
                    Остаток {overdue.reduce((s, l) => s + (l.outstanding || 0), 0).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="space-y-1.5">
                  {overdue.map(loan => renderCard(loan, user.id))}
                </div>
              </section>
            )}

            {/* 7. Некорректные */}
            {invalid.length > 0 && (
              <DashboardSection
                loans={invalid}
                userId={user.id}
                icon={<AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                title="Некорректные договоры"
                titleClass="text-destructive"
              />
            )}

            {/* 2. Требует моего действия — grouped */}
            {Object.entries(myActionGroups).map(([id, ls]) => {
              const meta = ACTION_GROUP_LABELS[id] || { title: ls[0].opState!.nextAction.label, icon: <Clock className="w-3.5 h-3.5 text-warning" /> };
              return (
                <DashboardSection
                  key={id}
                  loans={ls}
                  userId={user.id}
                  icon={meta.icon}
                  title={meta.title}
                />
              );
            })}

            {/* 3. Ожидает другую сторону */}
            {waiting.length > 0 && (
              <DashboardSection
                loans={waiting}
                userId={user.id}
                icon={<Clock className="w-3.5 h-3.5 text-info" />}
                title="Ожидает другую сторону"
              />
            )}

            {/* 4. Активные */}
            <DashboardSection
              loans={activeLoans}
              userId={user.id}
              title="Активные"
            />

            {/* 5. Черновики */}
            <DashboardSection
              loans={drafts}
              userId={user.id}
              icon={<FileEdit className="w-3.5 h-3.5 text-muted-foreground" />}
              title="Черновики"
            />

            {/* 6. Завершённые */}
            <DashboardSection
              loans={completed}
              userId={user.id}
              icon={<Archive className="w-3.5 h-3.5 text-muted-foreground" />}
              title="Завершённые"
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

function renderCard(loan: LoanWithPending, userId: string) {
  const op = loan.opState;
  return (
    <div key={loan.id} title={DEV_DEBUG && op ? `[dev] action=${op.nextAction.id} status=${op.statusKey}` : undefined}>
      <LoanCard
        loan={loan}
        type={loan.lender_id === userId ? 'issued' : 'taken'}
        overdue={loan.isOverdue ? { isOverdue: true, daysOverdue: loan.daysOverdue } : undefined}
        unifiedNext={op ? { label: op.nextAction.label, priority: op.nextAction.priority } : undefined}
        statusLabelOverride={op ? { label: op.statusLabel, tone: op.tone } : undefined}
      />
    </div>
  );
}

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
        {loans.map(loan => renderCard(loan, userId))}
      </div>
    </section>
  );
};

export default Dashboard;
