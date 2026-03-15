import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { generateLoanPDF } from '@/lib/pdf';
import { createSnapshot, SNAPSHOT_TYPES } from '@/legal/snapshots';
import { generateLoanContract, generateTrancheReceipt } from '@/legal/services/document-generator';
import SignaturePad from '@/components/SignaturePad';
import SendLoanModal from '@/components/SendLoanModal';
import { AllowedBankDetailsSelector } from '@/components/AllowedBankDetailsSelector';
import { TrancheList } from '@/components/TrancheList';
import { PaymentSchedule } from '@/components/PaymentSchedule';
import { RepaymentList } from '@/components/RepaymentList';
import { DocumentsList } from '@/components/DocumentsList';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, PenTool, CheckCircle2, Clock, FileText,
  User, Calendar, Percent, MapPin, AlertTriangle, Shield, Send,
  CreditCard,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type Signature = Tables<'loan_signatures'>;
type Tranche = Tables<'loan_tranches'>;
type ScheduleItem = Tables<'payment_schedule_items'>;
type Payment = Tables<'loan_payments'>;
type GeneratedDocument = Tables<'generated_documents'>;

const statusConfig: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  draft: { label: 'Черновик', icon: Clock, class: 'bg-muted text-muted-foreground' },
  awaiting_signatures: { label: 'Ожидает подписей', icon: PenTool, class: 'bg-warning/10 text-warning' },
  signed_by_lender: { label: 'Подписан займодавцем', icon: PenTool, class: 'bg-primary/10 text-primary' },
  signed_by_borrower: { label: 'Подписан заёмщиком', icon: PenTool, class: 'bg-primary/10 text-primary' },
  fully_signed: { label: 'Полностью подписан', icon: CheckCircle2, class: 'bg-accent/10 text-accent' },
  active: { label: 'Активный', icon: CheckCircle2, class: 'bg-accent/10 text-accent' },
  repaid: { label: 'Погашён', icon: CheckCircle2, class: 'bg-muted text-muted-foreground' },
  overdue: { label: 'Просрочен', icon: AlertTriangle, class: 'bg-destructive/10 text-destructive' },
};

const INTEREST_MODE_LABELS: Record<string, string> = {
  interest_free: 'Беспроцентный',
  fixed_rate: 'Фиксированная ставка',
};

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  no_schedule_single_deadline: 'Единый срок',
  installments_fixed: 'Фикс. платежи',
  installments_variable: 'Перем. платежи',
};

const LoanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [showSend, setShowSend] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) fetchAll();
  }, [id, user]);

  const fetchAll = async () => {
    const [loanRes, sigRes, trancheRes, schedRes, payRes, docRes] = await Promise.all([
      supabase.from('loans').select('*').eq('id', id!).single(),
      supabase.from('loan_signatures').select('*').eq('loan_id', id!),
      supabase.from('loan_tranches').select('*').eq('loan_id', id!).order('tranche_number'),
      supabase.from('payment_schedule_items').select('*').eq('loan_id', id!).order('item_number'),
      supabase.from('loan_payments').select('*').eq('loan_id', id!).order('transfer_date', { ascending: false }),
      supabase.from('generated_documents').select('*').eq('loan_id', id!).order('created_at', { ascending: false }),
    ]);
    setLoan(loanRes.data);
    setSignatures(sigRes.data || []);
    setTranches(trancheRes.data || []);
    setScheduleItems(schedRes.data || []);
    setPayments(payRes.data || []);
    setDocuments(docRes.data || []);
    setLoading(false);

    // Auto-activate loan when first tranche is confirmed
    if (loanRes.data && loanRes.data.status === 'fully_signed') {
      const hasConfirmedTranche = (trancheRes.data || []).some(t => t.status === 'confirmed');
      if (hasConfirmedTranche) {
        await supabase.from('loans').update({ status: 'active' }).eq('id', id!);
        setLoan(prev => prev ? { ...prev, status: 'active' } : prev);
      }
    }

    // Auto-detect full repayment
    if (loanRes.data && loanRes.data.status === 'active') {
      const confirmedTranches = (trancheRes.data || []).filter(t => t.status === 'confirmed');
      const totalDisbursed = confirmedTranches.reduce((s, t) => s + Number(t.amount), 0);
      const confirmedPayments = (payRes.data || []).filter(p => p.status === 'confirmed');
      const totalRepaid = confirmedPayments.reduce((s, p) => s + Number(p.transfer_amount), 0);
      if (totalDisbursed > 0 && totalRepaid >= totalDisbursed) {
        await supabase.from('loans').update({ status: 'repaid' }).eq('id', id!);
        setLoan(prev => prev ? { ...prev, status: 'repaid' } : prev);
      }
    }
  };

  const createSigningSnapshots = async (loanData: Loan, role: string) => {
    if (!user || !profile) return;

    try {
      // Party profile snapshot
      const email = user.email || null;
      await createSnapshot(
        loanData.id,
        SNAPSHOT_TYPES.PARTY_PROFILE,
        user.id,
        role,
        {
          user_id: user.id,
          full_name: profile.full_name,
          date_of_birth: profile.date_of_birth,
          passport_series: profile.passport_series,
          passport_number: profile.passport_number,
          passport_issued_by: profile.passport_issued_by,
          passport_issue_date: profile.passport_issue_date,
          passport_division_code: profile.passport_division_code,
          address: profile.address,
          phone: profile.phone,
          email,
        }
      );

      // Contract terms snapshot (only on first signature)
      const existingSnapshots = await supabase
        .from('signing_snapshots')
        .select('id')
        .eq('loan_id', loanData.id)
        .eq('snapshot_type', SNAPSHOT_TYPES.CONTRACT_TERMS)
        .limit(1);

      if (!existingSnapshots.data || existingSnapshots.data.length === 0) {
        await createSnapshot(
          loanData.id,
          SNAPSHOT_TYPES.CONTRACT_TERMS,
          user.id,
          role,
          {
            loan_id: loanData.id,
            contract_number: loanData.contract_number,
            amount: Number(loanData.amount),
            interest_rate: Number(loanData.interest_rate),
            interest_mode: loanData.interest_mode,
            interest_payment_schedule: loanData.interest_payment_schedule,
            penalty_rate: Number(loanData.penalty_rate),
            repayment_date: loanData.repayment_date,
            repayment_schedule_type: loanData.repayment_schedule_type,
            issue_date: loanData.issue_date,
            city: loanData.city,
            early_repayment_notice_days: loanData.early_repayment_notice_days,
            lender_name: loanData.lender_name,
            borrower_name: loanData.borrower_name,
            lender_passport: loanData.lender_passport,
            borrower_passport: loanData.borrower_passport,
            lender_address: loanData.lender_address,
            borrower_address: loanData.borrower_address,
          }
        );
      }

      // Allowed bank details snapshot (only on first signature)
      const existingBankSnapshot = await supabase
        .from('signing_snapshots')
        .select('id')
        .eq('loan_id', loanData.id)
        .eq('snapshot_type', SNAPSHOT_TYPES.ALLOWED_BANK_DETAILS)
        .limit(1);

      if (!existingBankSnapshot.data || existingBankSnapshot.data.length === 0) {
        const { data: allowedDetails } = await supabase
          .from('loan_allowed_bank_details')
          .select('*')
          .eq('loan_id', loanData.id);

        if (allowedDetails && allowedDetails.length > 0) {
          const bankIds = [...new Set(allowedDetails.map(a => a.bank_detail_id))];
          const { data: bankData } = await supabase
            .from('bank_details')
            .select('*')
            .in('id', bankIds);

          const bankMap = new Map((bankData || []).map(b => [b.id, b]));
          const details = allowedDetails.map(a => {
            const bank = bankMap.get(a.bank_detail_id);
            return {
              bank_detail_id: a.bank_detail_id,
              bank_name: bank?.bank_name || '',
              card_number: bank?.card_number || null,
              phone: bank?.phone || null,
              account_number: bank?.account_number || null,
              bik: bank?.bik || null,
              transfer_link: bank?.transfer_link || null,
              recipient_display_name: bank?.recipient_display_name || null,
              purpose: a.purpose,
              party_role: a.party_role,
            };
          });

          await createSnapshot(
            loanData.id,
            SNAPSHOT_TYPES.ALLOWED_BANK_DETAILS,
            user.id,
            role,
            { loan_id: loanData.id, details }
          );
        }
      }
    } catch (err: unknown) {
      // Snapshot creation is best-effort; don't block signing
      const message = err instanceof Error ? err.message : 'Snapshot error';
      toast.error(`Ошибка создания снимка: ${message}`);
    }
  };

  const handleSign = async (signatureDataUrl: string) => {
    if (!user || !loan) return;

    const role = loan.lender_id === user.id ? 'lender' : 'borrower';

    try {
      let ip = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip;
      } catch { /* IP detection is best-effort */ }

      // Create signing snapshots before recording the signature
      await createSigningSnapshots(loan, role);

      const { error } = await supabase.from('loan_signatures').insert({
        loan_id: loan.id,
        signer_id: user.id,
        role,
        signature_data: signatureDataUrl,
        signer_ip: ip,
      });
      if (error) throw error;

      const lenderSigned = role === 'lender' || signatures.some(s => s.role === 'lender');
      const borrowerSigned = role === 'borrower' || signatures.some(s => s.role === 'borrower');

      let newStatus = loan.status;
      if (lenderSigned && borrowerSigned) {
        newStatus = 'fully_signed';
      } else if (lenderSigned) {
        newStatus = 'signed_by_lender';
      } else if (borrowerSigned) {
        newStatus = 'signed_by_borrower';
      }

      await supabase.from('loans').update({ status: newStatus }).eq('id', loan.id);

      toast.success('Договор подписан!');
      setShowSignature(false);
      fetchAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка подписи';
      toast.error(message);
    }
  };

  const handleDownloadLegacyPDF = () => {
    if (!loan) return;
    generateLoanPDF({
      ...loan,
      signatures: signatures.map(s => ({
        role: s.role,
        signature_data: s.signature_data,
        signed_at: s.signed_at,
        signer_ip: s.signer_ip,
      })),
    });
  };

  const handleGenerateContract = async () => {
    if (!loan || !user) return;
    try {
      await generateLoanContract(loan.id, user.id);
      toast.success('Договор сформирован и скачан');
      fetchAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка генерации';
      toast.error(message);
    }
  };

  const handleGenerateTrancheReceipt = async (trancheId: string) => {
    if (!loan || !user) return;
    try {
      await generateTrancheReceipt(loan.id, trancheId, user.id);
      toast.success('Расписка о получении транша сформирована и скачана');
      fetchAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка генерации';
      toast.error(message);
    }
  };

  if (loading || authLoading || !loan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const status = statusConfig[loan.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');
  const isLender = user?.id === loan.lender_id;
  const isBorrower = user?.id === loan.borrower_id;
  const canSign = (isLender && !lenderSig) || (isBorrower && !borrowerSig);
  const canSend = isLender && !loan.borrower_id;
  const isFullySigned = Boolean(lenderSig && borrowerSig) ||
    ['fully_signed', 'active', 'repaid'].includes(loan.status);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold font-display text-sm sm:text-base truncate">Договор займа</h1>
              <p className="text-xs text-muted-foreground">
                {loan.contract_number ? `№ ${loan.contract_number}` : `ID: ${loan.id.slice(0, 8).toUpperCase()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {canSend && (
              <Button onClick={() => setShowSend(true)} variant="outline" size="sm" className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Отправить</span>
              </Button>
            )}
            {isFullySigned && (
              <Button variant="outline" onClick={handleGenerateContract} size="sm" className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Договор PDF</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
        {/* Send notification banner */}
        {canSend && (
          <div className="card-elevated p-5 flex items-center gap-4 bg-primary/5 border-primary/20">
            <Send className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-semibold text-sm font-display">Договор ещё не отправлен заёмщику</p>
              <p className="text-xs text-muted-foreground">Отправьте договор, чтобы заёмщик мог его подписать</p>
            </div>
            <Button onClick={() => setShowSend(true)} size="sm" className="rounded-xl gap-2">
              <Send className="w-4 h-4" />
              Отправить
            </Button>
          </div>
        )}

        {/* Status banner */}
        <div className={`card-elevated p-5 flex items-center gap-4 ${status.class} border-0`}>
          <StatusIcon className="w-6 h-6" />
          <div>
            <p className="font-semibold font-display">{status.label}</p>
            <p className="text-xs opacity-70">
              Создан {new Date(loan.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Main info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-elevated p-7">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">Сумма и условия</h3>
            <div className="stat-value text-3xl mb-4">{Number(loan.amount).toLocaleString('ru-RU')} ₽</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" />Тип</span>
                <span className="font-medium">{INTEREST_MODE_LABELS[loan.interest_mode] || loan.interest_mode}</span>
              </div>
              {loan.interest_mode === 'fixed_rate' && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ставка</span>
                  <span className="font-medium">{Number(loan.interest_rate)}% годовых</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Неустойка</span>
                <span className="font-medium">{Number(loan.penalty_rate)}%/день</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">График</span>
                <span className="font-medium">{SCHEDULE_TYPE_LABELS[loan.repayment_schedule_type] || loan.repayment_schedule_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" />Дата выдачи</span>
                <span className="font-medium">{new Date(loan.issue_date).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" />Срок возврата</span>
                <span className="font-medium">{new Date(loan.repayment_date).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" />Город</span>
                <span className="font-medium">{loan.city}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-elevated p-7">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Займодавец</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{loan.lender_name}</p>
                  {loan.lender_passport && <p className="text-xs text-muted-foreground">Паспорт: {loan.lender_passport}</p>}
                </div>
              </div>
              {loan.lender_address && <p className="text-xs text-muted-foreground">{loan.lender_address}</p>}
            </div>

            <div className="card-elevated p-7">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Заёмщик</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{loan.borrower_name}</p>
                  {loan.borrower_passport && <p className="text-xs text-muted-foreground">Паспорт: {loan.borrower_passport}</p>}
                </div>
              </div>
              {loan.borrower_address && <p className="text-xs text-muted-foreground">{loan.borrower_address}</p>}
              {!loan.borrower_id && (
                <p className="text-xs text-warning mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Заёмщик ещё не привязан к аккаунту
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="card-elevated p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Электронные подписи
            </h3>
            {canSign && (
              <Button onClick={() => setShowSignature(true)} className="gap-2 rounded-xl" size="sm">
                <PenTool className="w-4 h-4" />
                Подписать
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4 italic">
            Рукописная подпись в электронной форме (не является квалифицированной электронной подписью — УКЭП)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`rounded-xl border-2 p-4 ${lenderSig ? 'border-accent/30 bg-accent/5' : 'border-dashed border-border'}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Займодавец</p>
              {lenderSig ? (
                <div>
                  <img src={lenderSig.signature_data} alt="Подпись" className="h-16 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {new Date(lenderSig.signed_at).toLocaleString('ru-RU')}
                    {lenderSig.signer_ip && ` • IP: ${lenderSig.signer_ip}`}
                  </p>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Не подписан</p>
                </div>
              )}
            </div>

            <div className={`rounded-xl border-2 p-4 ${borrowerSig ? 'border-accent/30 bg-accent/5' : 'border-dashed border-border'}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Заёмщик</p>
              {borrowerSig ? (
                <div>
                  <img src={borrowerSig.signature_data} alt="Подпись" className="h-16 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {new Date(borrowerSig.signed_at).toLocaleString('ru-RU')}
                    {borrowerSig.signer_ip && ` • IP: ${borrowerSig.signer_ip}`}
                  </p>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Не подписан</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Allowed Bank Details */}
        <div className="card-elevated p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Допустимые реквизиты</h3>
              <p className="text-xs text-muted-foreground">Приложение 1 к договору</p>
            </div>
          </div>
          <AllowedBankDetailsSelector
            loanId={loan.id}
            lenderId={loan.lender_id}
            borrowerId={loan.borrower_id}
            loanStatus={loan.status}
            onUpdate={fetchAll}
          />
        </div>

        {/* Tranches */}
        <div className="card-elevated p-7">
          <TrancheList
            tranches={tranches}
            loanId={loan.id}
            userId={user!.id}
            isLender={isLender}
            isBorrower={isBorrower}
            loanStatus={loan.status}
            onRefresh={fetchAll}
            onGenerateReceipt={handleGenerateTrancheReceipt}
          />
        </div>

        {/* Payment Schedule */}
        <div className="card-elevated p-7">
          <PaymentSchedule
            items={scheduleItems}
            loanId={loan.id}
            isLender={isLender}
            loanStatus={loan.status}
            repaymentScheduleType={loan.repayment_schedule_type}
            onRefresh={fetchAll}
          />
        </div>

        {/* Repayments */}
        <div className="card-elevated p-7">
          <RepaymentList
            payments={payments}
            loanId={loan.id}
            userId={user!.id}
            isLender={isLender}
            isBorrower={isBorrower}
            loanStatus={loan.status}
            onRefresh={fetchAll}
          />
        </div>

        {/* Generated Documents */}
        <div className="card-elevated p-7">
          <DocumentsList documents={documents} />
        </div>
      </main>

      {showSignature && (
        <SignaturePad
          title={`Подписать как ${isLender ? 'займодавец' : 'заёмщик'}`}
          onSave={handleSign}
          onCancel={() => setShowSignature(false)}
        />
      )}

      {showSend && (
        <SendLoanModal
          loanId={loan.id}
          borrowerName={loan.borrower_name}
          onClose={() => setShowSend(false)}
          onSuccess={fetchAll}
        />
      )}
    </div>
  );
};

export default LoanDetails;
