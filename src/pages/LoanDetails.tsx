import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createSnapshot, SNAPSHOT_TYPES } from '@/legal/snapshots';
import SignaturePad from '@/components/SignaturePad';
import SendLoanModal from '@/components/SendLoanModal';
import { AllowedBankDetailsSelector } from '@/components/AllowedBankDetailsSelector';
import { TrancheList } from '@/components/TrancheList';
import { PaymentSchedule } from '@/components/PaymentSchedule';
import { RepaymentList } from '@/components/RepaymentList';
import { TransferEvidence } from '@/components/TransferEvidence';
import { LoanTimeline } from '@/components/LoanTimeline';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, PenTool, CheckCircle2, Clock,
  AlertTriangle, Shield, Send,
  CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type Signature = Tables<'loan_signatures'>;
type Tranche = Tables<'loan_tranches'>;
type ScheduleItem = Tables<'payment_schedule_items'>;
type Payment = Tables<'loan_payments'>;

const statusConfig: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  draft: { label: 'Черновик', icon: Clock, class: 'bg-muted text-muted-foreground' },
  awaiting_signatures: { label: 'Ожидает подписей', icon: PenTool, class: 'bg-warning/15 text-warning' },
  signed_by_lender: { label: 'Подписан займодавцем', icon: PenTool, class: 'bg-info/15 text-info' },
  signed_by_borrower: { label: 'Подписан заёмщиком', icon: PenTool, class: 'bg-info/15 text-info' },
  fully_signed: { label: 'Полностью подписан', icon: CheckCircle2, class: 'bg-primary/15 text-primary' },
  active: { label: 'Активный', icon: CheckCircle2, class: 'bg-primary/15 text-primary' },
  repaid: { label: 'Погашён', icon: CheckCircle2, class: 'bg-muted text-muted-foreground' },
  overdue: { label: 'Просрочен', icon: AlertTriangle, class: 'bg-destructive/15 text-destructive' },
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
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    terms: false,
    bank: false,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) fetchAll();
  }, [id, user]);

  const toggle = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchAll = async () => {
    const [loanRes, sigRes, trancheRes, schedRes, payRes] = await Promise.all([
      supabase.from('loans').select('*').eq('id', id!).single(),
      supabase.from('loan_signatures').select('*').eq('loan_id', id!),
      supabase.from('loan_tranches').select('*').eq('loan_id', id!).order('tranche_number'),
      supabase.from('payment_schedule_items').select('*').eq('loan_id', id!).order('item_number'),
      supabase.from('loan_payments').select('*').eq('loan_id', id!).order('transfer_date', { ascending: false }),
    ]);
    setLoan(loanRes.data);
    setSignatures(sigRes.data || []);
    setTranches(trancheRes.data || []);
    setScheduleItems(schedRes.data || []);
    setPayments(payRes.data || []);
    setLoading(false);

    if (loanRes.data && loanRes.data.status === 'fully_signed') {
      const hasConfirmedTranche = (trancheRes.data || []).some(t => t.status === 'confirmed');
      if (hasConfirmedTranche) {
        await supabase.from('loans').update({ status: 'active' }).eq('id', id!);
        setLoan(prev => prev ? { ...prev, status: 'active' } : prev);
      }
    }

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

  // --- Signing logic (preserved) ---
  const createSigningSnapshots = async (loanData: Loan, role: string) => {
    if (!user || !profile) return;
    try {
      const email = user.email || null;
      await createSnapshot(loanData.id, SNAPSHOT_TYPES.PARTY_PROFILE, user.id, role, {
        user_id: user.id, full_name: profile.full_name, date_of_birth: profile.date_of_birth,
        passport_series: profile.passport_series, passport_number: profile.passport_number,
        passport_issued_by: profile.passport_issued_by, passport_issue_date: profile.passport_issue_date,
        passport_division_code: profile.passport_division_code, address: profile.address,
        phone: profile.phone, email,
      });

      const existingSnapshots = await supabase.from('signing_snapshots').select('id').eq('loan_id', loanData.id).eq('snapshot_type', SNAPSHOT_TYPES.CONTRACT_TERMS).limit(1);
      if (!existingSnapshots.data || existingSnapshots.data.length === 0) {
        await createSnapshot(loanData.id, SNAPSHOT_TYPES.CONTRACT_TERMS, user.id, role, {
          loan_id: loanData.id, contract_number: loanData.contract_number, amount: Number(loanData.amount),
          interest_rate: Number(loanData.interest_rate), interest_mode: loanData.interest_mode,
          interest_payment_schedule: loanData.interest_payment_schedule, penalty_rate: Number(loanData.penalty_rate),
          repayment_date: loanData.repayment_date, repayment_schedule_type: loanData.repayment_schedule_type,
          issue_date: loanData.issue_date, city: loanData.city,
          early_repayment_notice_days: loanData.early_repayment_notice_days,
          lender_name: loanData.lender_name, borrower_name: loanData.borrower_name,
          lender_passport: loanData.lender_passport, borrower_passport: loanData.borrower_passport,
          lender_address: loanData.lender_address, borrower_address: loanData.borrower_address,
        });
      }

      const existingBankSnapshot = await supabase.from('signing_snapshots').select('id').eq('loan_id', loanData.id).eq('snapshot_type', SNAPSHOT_TYPES.ALLOWED_BANK_DETAILS).limit(1);
      if (!existingBankSnapshot.data || existingBankSnapshot.data.length === 0) {
        const { data: allowedDetails } = await supabase.from('loan_allowed_bank_details').select('*').eq('loan_id', loanData.id);
        if (allowedDetails && allowedDetails.length > 0) {
          const bankIds = [...new Set(allowedDetails.map(a => a.bank_detail_id))];
          const { data: bankData } = await supabase.from('bank_details').select('*').in('id', bankIds);
          const bankMap = new Map((bankData || []).map(b => [b.id, b]));
          const details = allowedDetails.map(a => {
            const bank = bankMap.get(a.bank_detail_id);
            return {
              bank_detail_id: a.bank_detail_id, bank_name: bank?.bank_name || '',
              card_number: bank?.card_number || null, phone: bank?.phone || null,
              account_number: bank?.account_number || null, bik: bank?.bik || null,
              transfer_link: bank?.transfer_link || null, recipient_display_name: bank?.recipient_display_name || null,
              purpose: a.purpose, party_role: a.party_role,
            };
          });
          await createSnapshot(loanData.id, SNAPSHOT_TYPES.ALLOWED_BANK_DETAILS, user.id, role, { loan_id: loanData.id, details });
        }
      }
    } catch (err: unknown) {
      toast.error(`Ошибка снимка: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  const handleSign = async (signatureDataUrl: string) => {
    if (!user || !loan) return;
    const role = loan.lender_id === user.id ? 'lender' : 'borrower';
    try {
      let ip = '';
      try { const res = await fetch('https://api.ipify.org?format=json'); ip = (await res.json()).ip; } catch {}
      await createSigningSnapshots(loan, role);
      const { error } = await supabase.from('loan_signatures').insert({ loan_id: loan.id, signer_id: user.id, role, signature_data: signatureDataUrl, signer_ip: ip });
      if (error) throw error;
      const lenderSigned = role === 'lender' || signatures.some(s => s.role === 'lender');
      const borrowerSigned = role === 'borrower' || signatures.some(s => s.role === 'borrower');
      let newStatus = loan.status;
      if (lenderSigned && borrowerSigned) newStatus = 'fully_signed';
      else if (lenderSigned) newStatus = 'signed_by_lender';
      else if (borrowerSigned) newStatus = 'signed_by_borrower';
      await supabase.from('loans').update({ status: newStatus }).eq('id', loan.id);
      toast.success('Договор подписан');
      setShowSignature(false);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };


  if (loading || authLoading || !loan) {
    return <AppLayout><div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Загрузка...</div></AppLayout>;
  }

  const status = statusConfig[loan.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');
  const isLender = user?.id === loan.lender_id;
  const isBorrower = user?.id === loan.borrower_id;
  const canSign = (isLender && !lenderSig) || (isBorrower && !borrowerSig);
  const canSend = isLender && !loan.borrower_id;
  const isFullySigned = Boolean(lenderSig && borrowerSig) || ['fully_signed', 'active', 'repaid'].includes(loan.status);
  const hasSchedule = ['installments_fixed', 'installments_variable'].includes(loan.repayment_schedule_type);

  // Calculate outstanding
  const confirmedTranches = tranches.filter(t => t.status === 'confirmed');
  const totalDisbursed = confirmedTranches.reduce((s, t) => s + Number(t.amount), 0);
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalRepaid = confirmedPayments.reduce((s, p) => s + Number(p.transfer_amount), 0);
  const outstanding = Math.max(0, totalDisbursed - totalRepaid);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-display truncate">
                {isLender ? loan.borrower_name : loan.lender_name}
              </h1>
              <span className={`pill-badge ${status.class}`}>{status.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {loan.contract_number ? `№ ${loan.contract_number}` : `ID: ${loan.id.slice(0, 8)}`}
            </p>
          </div>
        </div>

        {/* Summary card */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-3xl font-bold font-display">{Number(loan.amount).toLocaleString('ru-RU')} ₽</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loan.interest_mode === 'fixed_rate' ? `${Number(loan.interest_rate)}% годовых` : 'Без процентов'}
                {' • до '}
                {new Date(loan.repayment_date).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>

          {/* Outstanding principal */}
          {totalDisbursed > 0 && (
            <div className="flex gap-4 pt-3 border-t border-border/50">
              <div>
                <p className="stat-label">Выдано</p>
                <p className="text-sm font-bold text-primary">{totalDisbursed.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div>
                <p className="stat-label">Погашено</p>
                <p className="text-sm font-bold">{totalRepaid.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div>
                <p className="stat-label">Остаток</p>
                <p className={`text-sm font-bold ${outstanding > 0 ? 'text-warning' : 'text-primary'}`}>
                  {outstanding.toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Primary action */}
        {canSend && (
          <Button onClick={() => setShowSend(true)} className="w-full gap-2 rounded-lg h-10 text-sm">
            <Send className="w-4 h-4" />
            Отправить заёмщику
          </Button>
        )}
        {canSign && (
          <Button onClick={() => setShowSignature(true)} className="w-full gap-2 rounded-lg h-10 text-sm">
            <PenTool className="w-4 h-4" />
            Подписать как {isLender ? 'займодавец' : 'заёмщик'}
          </Button>
        )}

        {/* Timeline */}
        <div className="card-elevated p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Хронология</h2>
          <LoanTimeline loan={loan} signatures={signatures} tranches={tranches} payments={payments} />
        </div>

        {/* Signatures */}
        <div className="card-elevated p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Подписи
          </h2>
          <p className="text-[10px] text-muted-foreground mb-3">Простая электронная подпись (не является УКЭП)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-lg border p-3 ${lenderSig ? 'border-primary/30 bg-primary/5' : 'border-dashed border-border'}`}>
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Займодавец</p>
              {lenderSig ? (
                <>
                  <img src={lenderSig.signature_data} alt="" className="h-10 mb-1" />
                  <p className="text-[10px] text-muted-foreground">{new Date(lenderSig.signed_at).toLocaleDateString('ru-RU')}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground py-3 text-center">—</p>
              )}
            </div>
            <div className={`rounded-lg border p-3 ${borrowerSig ? 'border-primary/30 bg-primary/5' : 'border-dashed border-border'}`}>
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Заёмщик</p>
              {borrowerSig ? (
                <>
                  <img src={borrowerSig.signature_data} alt="" className="h-10 mb-1" />
                  <p className="text-[10px] text-muted-foreground">{new Date(borrowerSig.signed_at).toLocaleDateString('ru-RU')}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground py-3 text-center">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible: Terms */}
        <div className="card-elevated">
          <button onClick={() => toggle('terms')} className="w-full flex items-center justify-between p-4 text-left">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Условия</span>
            {expandedSections.terms ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {expandedSections.terms && (
            <div className="px-4 pb-4 space-y-2 text-sm">
              <Row label="Тип" value={INTEREST_MODE_LABELS[loan.interest_mode] || loan.interest_mode} />
              {loan.interest_mode === 'fixed_rate' && <Row label="Ставка" value={`${Number(loan.interest_rate)}% годовых`} />}
              <Row label="Неустойка" value={`${Number(loan.penalty_rate)}%/день`} />
              <Row label="График" value={SCHEDULE_TYPE_LABELS[loan.repayment_schedule_type] || loan.repayment_schedule_type} />
              <Row label="Дата выдачи" value={new Date(loan.issue_date).toLocaleDateString('ru-RU')} />
              <Row label="Срок возврата" value={new Date(loan.repayment_date).toLocaleDateString('ru-RU')} />
              <Row label="Город" value={loan.city} />
              <Row label="Займодавец" value={loan.lender_name} />
              <Row label="Заёмщик" value={loan.borrower_name} />
            </div>
          )}
        </div>

        {/* Collapsible: Bank details */}
        <div className="card-elevated">
          <button onClick={() => toggle('bank')} className="w-full flex items-center justify-between p-4 text-left">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              Реквизиты
            </span>
            {expandedSections.bank ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {expandedSections.bank && (
            <div className="px-4 pb-4">
              <AllowedBankDetailsSelector
                loanId={loan.id}
                lenderId={loan.lender_id}
                borrowerId={loan.borrower_id}
                loanStatus={loan.status}
                onUpdate={fetchAll}
              />
            </div>
          )}
        </div>

        {/* Tranches */}
        <div className="card-elevated p-5">
          <TrancheList
            tranches={tranches}
            loanId={loan.id}
            userId={user!.id}
            lenderId={loan.lender_id}
            borrowerId={loan.borrower_id}
            isLender={isLender}
            isBorrower={isBorrower}
            loanStatus={loan.status}
            contractNumber={loan.contract_number}
            onRefresh={fetchAll}
            onGenerateReceipt={handleGenerateTrancheReceipt}
          />
        </div>

        {/* Schedule */}
        {hasSchedule && (
          <div className="card-elevated p-5">
            <PaymentSchedule
              items={scheduleItems}
              loanId={loan.id}
              isLender={isLender}
              loanStatus={loan.status}
              repaymentScheduleType={loan.repayment_schedule_type}
              onRefresh={fetchAll}
            />
          </div>
        )}

        {/* Repayments */}
        <div className="card-elevated p-5">
          <RepaymentList
            payments={payments}
            loanId={loan.id}
            userId={user!.id}
            lenderId={loan.lender_id}
            isLender={isLender}
            isBorrower={isBorrower}
            loanStatus={loan.status}
            contractNumber={loan.contract_number}
            onRefresh={fetchAll}
            onGenerateConfirmation={handleGeneratePartialConfirmation}
          />
        </div>

        {/* Transfer Evidence — separate from documents */}
        <TransferEvidence tranches={tranches} payments={payments} />
      </div>

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
    </AppLayout>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default LoanDetails;
