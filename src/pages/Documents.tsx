import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  generateLoanContract,
  generateTrancheReceipt,
  generateAppendixBankDetails,
  generateAppendixSchedule,
  generatePartialRepaymentConfirmation,
  generateFullRepaymentConfirmation,
  generateUnepAgreement,
  generateEdoRegulation,
} from '@/legal/services/document-generator';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  FileText, Download, Loader2, ChevronRight,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type Doc = Tables<'generated_documents'>;
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
  unep_agreement: 'Приложение 6: Соглашение УНЭП',
  edo_regulation: 'Регламент ЭДО',
};

const statusLabels: Record<string, { label: string; class: string }> = {
  draft: { label: 'Черновик', class: 'bg-muted text-muted-foreground' },
  awaiting_signatures: { label: 'Подписание', class: 'bg-warning/15 text-warning' },
  signed_by_lender: { label: 'Ждёт заёмщика', class: 'bg-info/15 text-info' },
  signed_by_borrower: { label: 'Ждёт займодавца', class: 'bg-info/15 text-info' },
  fully_signed: { label: 'Подписан', class: 'bg-primary/15 text-primary' },
  active: { label: 'Активный', class: 'bg-primary/15 text-primary' },
  repaid: { label: 'Погашён', class: 'bg-muted text-muted-foreground' },
  overdue: { label: 'Просрочен', class: 'bg-destructive/15 text-destructive' },
};

const Documents = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [loanDocs, setLoanDocs] = useState<Doc[]>([]);
  const [loanTranches, setLoanTranches] = useState<Tranche[]>([]);
  const [loanPayments, setLoanPayments] = useState<Payment[]>([]);
  const [loanSchedule, setLoanSchedule] = useState<ScheduleItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    const { data } = await supabase.from('loans').select('*').order('created_at', { ascending: false });
    setLoans(data || []);
    setLoadingLoans(false);
  };

  const toggleLoan = async (loanId: string) => {
    if (expandedLoanId === loanId) {
      setExpandedLoanId(null);
      return;
    }
    setExpandedLoanId(loanId);
    setLoadingDocs(true);
    const [docRes, trancheRes, payRes, schedRes] = await Promise.all([
      supabase.from('generated_documents').select('*').eq('loan_id', loanId).order('created_at', { ascending: false }),
      supabase.from('loan_tranches').select('*').eq('loan_id', loanId).eq('status', 'confirmed').order('tranche_number'),
      supabase.from('loan_payments').select('*').eq('loan_id', loanId).eq('status', 'confirmed').order('transfer_date', { ascending: false }),
      supabase.from('payment_schedule_items').select('*').eq('loan_id', loanId).order('item_number'),
    ]);
    setLoanDocs(docRes.data || []);
    setLoanTranches(trancheRes.data || []);
    setLoanPayments(payRes.data || []);
    setLoanSchedule(schedRes.data || []);
    setLoadingDocs(false);
  };

  const generate = async (type: string, loanId: string, entityId?: string) => {
    if (!user) return;
    setGenerating(type + (entityId || ''));
    try {
      switch (type) {
        case 'loan_contract': await generateLoanContract(loanId, user.id); break;
        case 'appendix_bank_details': await generateAppendixBankDetails(loanId, user.id); break;
        case 'appendix_repayment_schedule': await generateAppendixSchedule(loanId, user.id); break;
        case 'tranche_receipt': if (entityId) await generateTrancheReceipt(loanId, entityId, user.id); break;
        case 'partial_repayment_confirmation': if (entityId) await generatePartialRepaymentConfirmation(loanId, entityId, user.id); break;
        case 'full_repayment_confirmation': await generateFullRepaymentConfirmation(loanId, user.id); break;
        case 'unep_agreement': await generateUnepAgreement(loanId, user.id); break;
        case 'edo_regulation': await generateEdoRegulation(loanId, user.id); break;
      }
      toast.success('Документ сформирован и скачан');
      // Refresh docs for this loan
      const { data } = await supabase.from('generated_documents').select('*').eq('loan_id', loanId).order('created_at', { ascending: false });
      setLoanDocs(data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка генерации');
    } finally {
      setGenerating(null);
    }
  };

  if (loading || !user) return null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl font-bold font-display mb-1">Документы</h1>
        <p className="text-sm text-muted-foreground mb-6">Выберите займ для скачивания документов</p>

        {loadingLoans ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Загрузка...</div>
        ) : loans.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold font-display mb-1">Займов пока нет</p>
            <p className="text-xs text-muted-foreground">Создайте займ, чтобы здесь появились документы.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {loans.map(loan => {
              const isLender = loan.lender_id === user.id;
              const type = isLender ? 'issued' : 'taken';
              const status = statusLabels[loan.status] || statusLabels.draft;
              const isExpanded = expandedLoanId === loan.id;
              const isFullySigned = ['fully_signed', 'active', 'repaid'].includes(loan.status);
              const hasSchedule = ['installments_fixed', 'installments_variable'].includes(loan.repayment_schedule_type);
              const totalDisbursed = loanTranches.reduce((s, t) => s + Number(t.amount), 0);
              const totalRepaid = loanPayments.reduce((s, p) => s + Number(p.transfer_amount), 0);

              return (
                <div key={loan.id}>
                  {/* Loan card — same style as Dashboard */}
                  <div
                    onClick={() => toggleLoan(loan.id)}
                    className={`card-elevated p-4 cursor-pointer group transition-all ${isExpanded ? 'border-primary/30' : 'hover:border-border'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        type === 'issued' ? 'bg-primary/10' : 'bg-info/10'
                      }`}>
                        {type === 'issued'
                          ? <ArrowUpRight className="w-5 h-5 text-primary" />
                          : <ArrowDownLeft className="w-5 h-5 text-info" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">
                            {type === 'issued' ? loan.borrower_name : loan.lender_name}
                          </p>
                          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold font-display">
                            {Number(loan.amount).toLocaleString('ru-RU')} ₽
                          </span>
                          <span className={`pill-badge ${status.class}`}>{status.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {loan.contract_number && <span>№ {loan.contract_number}</span>}
                          <span>до {new Date(loan.repayment_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded document panel */}
                  {isExpanded && (
                    <div className="ml-4 mr-1 mt-1 mb-3 border-l-2 border-primary/20 pl-4 space-y-3 py-3">
                      {loadingDocs ? (
                        <div className="text-sm text-muted-foreground py-4 text-center">Загрузка...</div>
                      ) : (
                        <>
                          {/* Document list */}
                          {isFullySigned && (
                            <div className="space-y-1.5">
                              {/* Static document entries */}
                              <DocRow label="Договор займа" type="loan_contract" loanId={loan.id} generating={generating} onGen={generate} />
                              <DocRow label="Приложение 1: Банковские реквизиты" type="appendix_bank_details" loanId={loan.id} generating={generating} onGen={generate} />
                              {hasSchedule && loanSchedule.length > 0 && (
                                <DocRow label="Приложение 2: График погашения" type="appendix_repayment_schedule" loanId={loan.id} generating={generating} onGen={generate} />
                              )}
                              {loanTranches.map(t => (
                                <DocRow
                                  key={t.id}
                                  label={`Расписка — транш №${t.tranche_number}`}
                                  type="tranche_receipt"
                                  loanId={loan.id}
                                  entityId={t.id}
                                  generating={generating}
                                  onGen={generate}
                                />
                              ))}
                              {loanPayments.map(p => (
                                <DocRow
                                  key={p.id}
                                  label={`Погашение — ${Number(p.transfer_amount).toLocaleString('ru-RU')} ₽`}
                                  type="partial_repayment_confirmation"
                                  loanId={loan.id}
                                  entityId={p.id}
                                  generating={generating}
                                  onGen={generate}
                                />
                              ))}
                              {isLender && totalDisbursed > 0 && totalRepaid >= totalDisbursed && (
                                <DocRow label="Полное погашение" type="full_repayment_confirmation" loanId={loan.id} generating={generating} onGen={generate} />
                              )}
                              {loan.signature_scheme_requested === 'UNEP_WITH_APPENDIX_6' && (
                                <DocRow label="Приложение 6: Соглашение УНЭП" type="unep_agreement" loanId={loan.id} generating={generating} onGen={generate} />
                              )}
                              <DocRow label="Регламент ЭДО" type="edo_regulation" loanId={loan.id} generating={generating} onGen={generate} />
                            </div>
                          )}

                          {!isFullySigned && (
                            <p className="text-xs text-muted-foreground py-2">
                              Документы будут доступны после подписания договора обеими сторонами.
                            </p>
                          )}

                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const DocRow = ({
  label, type, loanId, entityId, generating, onGen,
}: {
  label: string;
  type: string;
  loanId: string;
  entityId?: string;
  generating: string | null;
  onGen: (type: string, loanId: string, entityId?: string) => void;
}) => {
  const key = type + (entityId || '');
  const isLoading = generating === key;
  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/20 hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={() => onGen(type, loanId, entityId)}
    >
      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
      <p className="text-sm font-medium truncate flex-1">{label}</p>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 rounded-lg text-muted-foreground hover:text-primary-foreground hover:bg-primary/80"
        disabled={generating !== null}
        onClick={(e) => { e.stopPropagation(); onGen(type, loanId, entityId); }}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </Button>
    </div>
  );
};

export default Documents;
