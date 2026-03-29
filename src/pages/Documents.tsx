import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  generateLoanContract,
  generateTrancheReceipt,
  generateAppendixBankDetails,
  generateAppendixSchedule,
  generatePartialRepaymentConfirmation,
  generateFullRepaymentConfirmation,
} from '@/legal/services/document-generator';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileText, FileCheck, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Doc = Tables<'generated_documents'>;
type Loan = Tables<'loans'>;
type Tranche = Tables<'loan_tranches'>;
type Payment = Tables<'loan_payments'>;
type ScheduleItem = Tables<'payment_schedule_items'>;

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
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchLoans();
  }, [user]);

  useEffect(() => {
    if (selectedLoanId) fetchLoanData();
  }, [selectedLoanId]);

  const fetchLoans = async () => {
    const { data } = await supabase.from('loans').select('*').order('created_at', { ascending: false });
    setLoans(data || []);
    setLoadingLoans(false);
  };

  const fetchLoanData = async () => {
    setLoadingDocs(true);
    const [docRes, trancheRes, payRes, schedRes] = await Promise.all([
      supabase.from('generated_documents').select('*').eq('loan_id', selectedLoanId).order('created_at', { ascending: false }),
      supabase.from('loan_tranches').select('*').eq('loan_id', selectedLoanId).order('tranche_number'),
      supabase.from('loan_payments').select('*').eq('loan_id', selectedLoanId).order('transfer_date', { ascending: false }),
      supabase.from('payment_schedule_items').select('*').eq('loan_id', selectedLoanId).order('item_number'),
    ]);
    setDocs(docRes.data || []);
    setTranches(trancheRes.data || []);
    setPayments(payRes.data || []);
    setScheduleItems(schedRes.data || []);
    setLoadingDocs(false);
  };

  const selectedLoan = useMemo(() => loans.find(l => l.id === selectedLoanId), [loans, selectedLoanId]);

  const isLender = selectedLoan?.lender_id === user?.id;
  const isFullySigned = selectedLoan && ['fully_signed', 'active', 'repaid'].includes(selectedLoan.status);
  const hasSchedule = selectedLoan && ['installments_fixed', 'installments_variable'].includes(selectedLoan.repayment_schedule_type);
  const confirmedTranches = tranches.filter(t => t.status === 'confirmed');
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalDisbursed = confirmedTranches.reduce((s, t) => s + Number(t.amount), 0);
  const totalRepaid = confirmedPayments.reduce((s, p) => s + Number(p.transfer_amount), 0);

  const generate = async (type: string, entityId?: string) => {
    if (!selectedLoan || !user) return;
    setGenerating(type + (entityId || ''));
    try {
      switch (type) {
        case 'loan_contract':
          await generateLoanContract(selectedLoan.id, user.id); break;
        case 'appendix_bank_details':
          await generateAppendixBankDetails(selectedLoan.id, user.id); break;
        case 'appendix_repayment_schedule':
          await generateAppendixSchedule(selectedLoan.id, user.id); break;
        case 'tranche_receipt':
          if (entityId) await generateTrancheReceipt(selectedLoan.id, entityId, user.id); break;
        case 'partial_repayment_confirmation':
          if (entityId) await generatePartialRepaymentConfirmation(selectedLoan.id, entityId, user.id); break;
        case 'full_repayment_confirmation':
          await generateFullRepaymentConfirmation(selectedLoan.id, user.id); break;
      }
      toast.success('Документ сформирован');
      fetchLoanData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка генерации');
    } finally {
      setGenerating(null);
    }
  };

  if (loading || !user) return null;

  const loanLabel = (l: Loan) => {
    const counterparty = l.lender_id === user.id ? l.borrower_name : l.lender_name;
    const role = l.lender_id === user.id ? 'выдан' : 'получен';
    return `${l.contract_number || l.id.slice(0, 8)} — ${counterparty} — ${Number(l.amount).toLocaleString('ru-RU')} ₽ (${role})`;
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl font-bold font-display mb-1">Документы</h1>
        <p className="text-sm text-muted-foreground mb-5">Выберите займ для просмотра и скачивания документов</p>

        {/* Loan selector */}
        {loadingLoans ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Загрузка...</div>
        ) : loans.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold font-display mb-1">Займов пока нет</p>
            <p className="text-xs text-muted-foreground">Создайте займ, чтобы здесь появились документы.</p>
          </div>
        ) : (
          <>
            <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
              <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-border/50 mb-6 text-sm">
                <SelectValue placeholder="Выберите займ..." />
              </SelectTrigger>
              <SelectContent>
                {loans.map(l => (
                  <SelectItem key={l.id} value={l.id}>{loanLabel(l)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLoanId && (
              <>
                {loadingDocs ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Загрузка документов...</div>
                ) : (
                  <div className="space-y-6">
                    {/* Generation actions */}
                    {isFullySigned && (
                      <div className="card-elevated p-5">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Сформировать документы</h2>
                        <div className="flex flex-wrap gap-2">
                          <GenButton label="Договор" type="loan_contract" generating={generating} onGenerate={generate} />
                          <GenButton label="Прил. 1 — Реквизиты" type="appendix_bank_details" generating={generating} onGenerate={generate} />
                          {hasSchedule && scheduleItems.length > 0 && (
                            <GenButton label="Прил. 2 — График" type="appendix_repayment_schedule" generating={generating} onGenerate={generate} />
                          )}
                          {confirmedTranches.map(t => (
                            <GenButton
                              key={t.id}
                              label={`Расписка — транш №${t.tranche_number}`}
                              type="tranche_receipt"
                              entityId={t.id}
                              generating={generating}
                              onGenerate={generate}
                            />
                          ))}
                          {confirmedPayments.map(p => (
                            <GenButton
                              key={p.id}
                              label={`Подтверждение — ${Number(p.transfer_amount).toLocaleString('ru-RU')} ₽`}
                              type="partial_repayment_confirmation"
                              entityId={p.id}
                              generating={generating}
                              onGenerate={generate}
                            />
                          ))}
                          {isLender && selectedLoan?.status === 'repaid' && totalDisbursed > 0 && totalRepaid >= totalDisbursed && (
                            <GenButton label="Полное погашение" type="full_repayment_confirmation" generating={generating} onGenerate={generate} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Existing documents */}
                    {docs.length === 0 ? (
                      <div className="card-elevated p-10 text-center">
                        <FileText className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {isFullySigned
                            ? 'Документы ещё не сформированы. Нажмите кнопку выше.'
                            : 'Документы появятся после подписания договора.'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Сформированные документы ({docs.length})
                        </h2>
                        <div className="space-y-2">
                          {docs.map(doc => (
                            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                              <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                                <FileCheck className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  v{doc.template_version} • {new Date(doc.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

const GenButton = ({
  label, type, entityId, generating, onGenerate,
}: {
  label: string;
  type: string;
  entityId?: string;
  generating: string | null;
  onGenerate: (type: string, entityId?: string) => void;
}) => {
  const key = type + (entityId || '');
  const isLoading = generating === key;
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl text-xs gap-1.5"
      disabled={generating !== null}
      onClick={() => onGenerate(type, entityId)}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {label}
    </Button>
  );
};

export default Documents;
