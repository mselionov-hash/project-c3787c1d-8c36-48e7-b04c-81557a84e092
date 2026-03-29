import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { FileText, FileCheck } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Doc = Tables<'generated_documents'>;
type Loan = Tables<'loans'>;

const DOC_TYPE_LABELS: Record<string, string> = {
  loan_contract: 'Договор займа',
  tranche_receipt: 'Расписка о получении транша',
  appendix_bank_details: 'Приложение 1: Банковские реквизиты',
  appendix_repayment_schedule: 'Приложение 2: График погашения',
  partial_repayment_confirmation: 'Подтверждение частичного погашения',
  full_repayment_confirmation: 'Подтверждение полного погашения',
};

const Documents = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const [docRes, loanRes] = await Promise.all([
      supabase.from('generated_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('loans').select('*'),
    ]);
    setDocs(docRes.data || []);
    setLoans(loanRes.data || []);
    setLoadingDocs(false);
  };

  if (loading || !user) return null;

  const loanMap = new Map(loans.map(l => [l.id, l]));
  const groupedByLoan = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    (acc[d.loan_id] = acc[d.loan_id] || []).push(d);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl font-bold font-display mb-2">Документы</h1>
        <p className="text-sm text-muted-foreground mb-6">Все сформированные документы по вашим займам</p>

        {loadingDocs ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Загрузка...</div>
        ) : docs.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold font-display mb-1">Документов пока нет</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Документы создаются автоматически: договор формируется после подписания, расписки — после подтверждения транша, подтверждения — после подтверждения платежей.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByLoan).map(([loanId, loanDocs]) => {
              const loan = loanMap.get(loanId);
              const isLender = loan?.lender_id === user.id;
              const counterparty = isLender ? loan?.borrower_name : loan?.lender_name;

              return (
                <div key={loanId}>
                  <button
                    onClick={() => navigate(`/loans/${loanId}`)}
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground transition-colors"
                  >
                    {counterparty ? `${counterparty} • ` : ''}
                    {loan ? `${Number(loan.amount).toLocaleString('ru-RU')} ₽` : loanId.slice(0, 8)}
                    {isLender ? ' (выдан)' : ' (получен)'}
                  </button>
                  <div className="space-y-1.5">
                    {loanDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30">
                        <FileCheck className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Documents;
