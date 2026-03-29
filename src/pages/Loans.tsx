import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { LoanCard } from '@/components/LoanCard';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;

const Loans = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [tab, setTab] = useState<'issued' | 'taken'>('issued');

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

        {/* Tabs */}
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
            {currentList.map(loan => (
              <LoanCard key={loan.id} loan={loan} type={tab} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Loans;
