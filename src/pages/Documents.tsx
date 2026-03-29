import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileText, FileCheck, Search, Filter, Calendar, Download } from 'lucide-react';
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

const DOC_TYPES = Object.keys(DOC_TYPE_LABELS);

type Tab = 'all' | 'issued' | 'received';

const Documents = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Filters
  const [tab, setTab] = useState<Tab>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLoan, setFilterLoan] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const loanMap = useMemo(() => new Map(loans.map(l => [l.id, l])), [loans]);

  const filteredDocs = useMemo(() => {
    let result = docs;

    // Tab filter
    if (tab === 'issued') {
      result = result.filter(d => {
        const loan = loanMap.get(d.loan_id);
        return loan && loan.lender_id === user?.id;
      });
    } else if (tab === 'received') {
      result = result.filter(d => {
        const loan = loanMap.get(d.loan_id);
        return loan && loan.borrower_id === user?.id;
      });
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(d => d.document_type === filterType);
    }

    // Loan filter
    if (filterLoan !== 'all') {
      result = result.filter(d => d.loan_id === filterLoan);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => {
        const label = DOC_TYPE_LABELS[d.document_type] || d.document_type;
        const loan = loanMap.get(d.loan_id);
        const loanLabel = loan?.contract_number || d.loan_id.slice(0, 8);
        return label.toLowerCase().includes(q) || loanLabel.toLowerCase().includes(q);
      });
    }

    return result;
  }, [docs, tab, filterType, filterLoan, searchQuery, loanMap, user]);

  // Group by loan
  const groupedByLoan = useMemo(() => {
    const groups: Record<string, Doc[]> = {};
    filteredDocs.forEach(d => {
      (groups[d.loan_id] = groups[d.loan_id] || []).push(d);
    });
    return groups;
  }, [filteredDocs]);

  if (loading || !user) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'issued', label: 'Выданные займы' },
    { key: 'received', label: 'Полученные займы' },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl font-bold font-display mb-1">Документы</h1>
        <p className="text-sm text-muted-foreground mb-5">Архив всех юридических документов</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary/50 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по документам..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/50 border-border/50"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 w-full sm:w-48">
              <SelectValue placeholder="Тип документа" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {DOC_TYPES.map(t => (
                <SelectItem key={t} value={t}>{DOC_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLoan} onValueChange={setFilterLoan}>
            <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 w-full sm:w-48">
              <SelectValue placeholder="По займу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все займы</SelectItem>
              {loans.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.contract_number || l.id.slice(0, 8)} — {Number(l.amount).toLocaleString('ru-RU')} ₽
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loadingDocs ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Загрузка...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold font-display mb-1">
              {docs.length === 0 ? 'Документов пока нет' : 'Ничего не найдено'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Документы формируются автоматически после подписания договора, подтверждения траншей и платежей.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByLoan).map(([loanId, loanDocs]) => {
              const loan = loanMap.get(loanId);
              const isLender = loan?.lender_id === user.id;
              const counterparty = isLender ? loan?.borrower_name : loan?.lender_name;
              const roleLabel = isLender ? 'Займодавец' : 'Заёмщик';

              return (
                <div key={loanId}>
                  <button
                    onClick={() => navigate(`/loans/${loanId}`)}
                    className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground transition-colors"
                  >
                    <span>{loan?.contract_number || loanId.slice(0, 8)}</span>
                    <span className="text-border">•</span>
                    <span>{counterparty}</span>
                    <span className="text-border">•</span>
                    <span>{loan ? `${Number(loan.amount).toLocaleString('ru-RU')} ₽` : ''}</span>
                    <span className={`pill-badge text-[9px] ${isLender ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'}`}>
                      {roleLabel}
                    </span>
                  </button>
                  <div className="space-y-2">
                    {loanDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                          <FileCheck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            v{doc.template_version}
                            {' • '}
                            {new Date(doc.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {doc.source_entity_id && ` • ref: ${doc.source_entity_id.slice(0, 6)}`}
                          </p>
                        </div>
                        <span className={`pill-badge text-[9px] ${isLender ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'}`}>
                          {roleLabel}
                        </span>
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
