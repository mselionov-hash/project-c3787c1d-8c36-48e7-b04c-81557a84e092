import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { LoanCard } from '@/components/LoanCard';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { isLoanOverdue, overdueDays } from '@/lib/loan-status';
import { getLoanOperationalState, type BankReadiness, type OperationalState } from '@/lib/loan-next-action';

type Loan = Tables<'loans'>;
type Tranche = Tables<'loan_tranches'>;
type Payment = Tables<'loan_payments'>;
type Signature = Tables<'loan_signatures'>;
type AllowedBank = Tables<'loan_allowed_bank_details'>;

const Loans = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [opStateByLoan, setOpStateByLoan] = useState<Record<string, OperationalState>>({});
  const [overdueByLoan, setOverdueByLoan] = useState<Record<string, { isOverdue: boolean; daysOverdue: number }>>({});
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [tab, setTab] = useState<'issued' | 'taken'>('issued');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    const [loansRes, tr, pr, sr, ar] = await Promise.all([
      supabase.from('loans').select('*').is('archived_at', null).order('created_at', { ascending: false }),
      supabase.from('loan_tranches').select('loan_id, amount, status, tranche_number'),
      supabase.from('loan_payments').select('loan_id, transfer_amount, status'),
      supabase.from('loan_signatures').select('loan_id, role'),
      supabase.from('loan_allowed_bank_details').select('loan_id, party_role, purpose'),
    ]);

    const data = loansRes.data || [];
    const tMap = new Map<string, Pick<Tranche, 'amount' | 'status' | 'tranche_number'>[]>();
    for (const t of (tr.data || [])) {
      const arr = tMap.get(t.loan_id) || []; arr.push(t as any); tMap.set(t.loan_id, arr);
    }
    const pMap = new Map<string, Pick<Payment, 'transfer_amount' | 'status'>[]>();
    for (const p of (pr.data || [])) {
      const arr = pMap.get(p.loan_id) || []; arr.push(p as any); pMap.set(p.loan_id, arr);
    }
    const sMap = new Map<string, Pick<Signature, 'role'>[]>();
    for (const s of (sr.data || []) as any[]) {
      const arr = sMap.get(s.loan_id) || []; arr.push({ role: s.role }); sMap.set(s.loan_id, arr);
    }
    const aMap = new Map<string, Array<Pick<AllowedBank, 'party_role' | 'purpose'>>>();
    for (const a of (ar.data || []) as any[]) {
      const arr = aMap.get(a.loan_id) || []; arr.push({ party_role: a.party_role, purpose: a.purpose }); aMap.set(a.loan_id, arr);
    }

    const opMap: Record<string, OperationalState> = {};
    const odMap: Record<string, { isOverdue: boolean; daysOverdue: number }> = {};
    for (const l of data) {
      const ts = tMap.get(l.id) || [];
      const ps = pMap.get(l.id) || [];
      const sigs = sMap.get(l.id) || [];
      const allowed = aMap.get(l.id) || [];
      const bankReadiness: BankReadiness = {
        lenderDisbursementReady: allowed.some(a => a.party_role === 'lender' && a.purpose === 'disbursement'),
        borrowerDisbursementReady: allowed.some(a => a.party_role === 'borrower' && a.purpose === 'disbursement'),
        lenderRepaymentReady: allowed.some(a => a.party_role === 'lender' && a.purpose === 'repayment'),
        borrowerRepaymentReady: allowed.some(a => a.party_role === 'borrower' && a.purpose === 'repayment'),
      };
      opMap[l.id] = getLoanOperationalState({
        loan: l, userId: user!.id, tranches: ts, payments: ps,
        bankReadiness, signatures: sigs, latestAiChecks: [],
      });
      const od = isLoanOverdue(l, ts, ps);
      odMap[l.id] = { isOverdue: od, daysOverdue: od ? overdueDays(l.repayment_date) : 0 };
    }

    setLoans(data);
    setOpStateByLoan(opMap);
    setOverdueByLoan(odMap);
    setLoadingLoans(false);
  };

  if (loading || !user) return null;

  const issued = loans.filter(l => l.lender_id === user.id);
  const taken = loans.filter(l => l.borrower_id === user.id);
  const currentList = tab === 'issued' ? issued : taken;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Мои займы</h1>
          <Button onClick={() => navigate('/loans/create')} className="gap-2 rounded-lg h-9 text-xs" size="sm">
            <Plus className="w-3.5 h-3.5" />
            Создать
          </Button>
        </div>

        <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-6">
          <button
            onClick={() => setTab('issued')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              tab === 'issued' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Выданные ({issued.length})
          </button>
          <button
            onClick={() => setTab('taken')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              tab === 'taken' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Полученные ({taken.length})
          </button>
        </div>

        {loadingLoans ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Загрузка...</div>
        ) : currentList.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {tab === 'issued' ? 'Вы ещё не выдали ни одного займа' : 'Вы ещё не получили ни одного займа'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.map(loan => {
              const op = opStateByLoan[loan.id];
              const od = overdueByLoan[loan.id];
              return (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  type={tab}
                  overdue={od?.isOverdue ? { isOverdue: true, daysOverdue: od.daysOverdue } : undefined}
                  unifiedNext={op ? { label: op.nextAction.label, priority: op.nextAction.priority } : undefined}
                  statusLabelOverride={op ? { label: op.statusLabel, tone: op.tone } : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Loans;
