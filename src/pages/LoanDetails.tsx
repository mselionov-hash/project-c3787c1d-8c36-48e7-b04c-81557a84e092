import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createSnapshot, SNAPSHOT_TYPES } from '@/legal/snapshots';
import SignaturePad from '@/components/SignaturePad';
import SendLoanModal from '@/components/SendLoanModal';
import { AllowedBankDetailsSelector } from '@/components/AllowedBankDetailsSelector';
import { TrancheList } from '@/components/TrancheList';
import { CreateTrancheModal } from '@/components/CreateTrancheModal';
import { PaymentSchedule } from '@/components/PaymentSchedule';
import { RepaymentList } from '@/components/RepaymentList';
import { TransferEvidence } from '@/components/TransferEvidence';
import { LoanTimeline } from '@/components/LoanTimeline';
import { EdoRegulationAcceptance } from '@/components/EdoRegulationAcceptance';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, PenTool, CheckCircle2, Clock,
  AlertTriangle, Shield, Send, FileText,
  CreditCard, ChevronDown, ChevronUp, Banknote,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { formatDateSafe } from '@/lib/date-utils';

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
  fully_signed: { label: 'Подписан', icon: CheckCircle2, class: 'bg-primary/15 text-primary' },
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

type SectionKey = 'terms' | 'bank' | 'tranches' | 'schedule' | 'repayments' | 'signatures' | 'evidence';

const LoanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allowedDetails, setAllowedDetails] = useState<{ party_role: string; purpose: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showCreateTranche, setShowCreateTranche] = useState(false);
  const [edoAcceptedByUser, setEdoAcceptedByUser] = useState(false);
  const [edoAcceptedByCounterparty, setEdoAcceptedByCounterparty] = useState(false);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    terms: false,
    bank: false,
    tranches: true,
    schedule: false,
    repayments: true,
    signatures: false,
    evidence: false,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) fetchAll();
  }, [id, user]);

  const toggle = (key: SectionKey) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const refreshEdoAcceptance = async (loanData: Loan, userId: string) => {
    const { data } = await supabase.rpc('get_loan_edo_acceptance', { p_loan_id: loanData.id });
    if (!data || (data as any).error || (data as any).has_regulation === false) return;
    const d = data as Record<string, unknown>;
    const isL = loanData.lender_id === userId;
    setEdoAcceptedByUser(isL ? !!d.lender_accepted : !!d.borrower_accepted);
    setEdoAcceptedByCounterparty(isL ? !!d.borrower_accepted : !!d.lender_accepted);
  };

  const fetchAll = async () => {
    const [loanRes, sigRes, trancheRes, schedRes, payRes, allowedRes] = await Promise.all([
      supabase.from('loans').select('*').eq('id', id!).single(),
      supabase.from('loan_signatures').select('*').eq('loan_id', id!),
      supabase.from('loan_tranches').select('*').eq('loan_id', id!).order('tranche_number'),
      supabase.from('payment_schedule_items').select('*').eq('loan_id', id!).order('item_number'),
      supabase.from('loan_payments').select('*').eq('loan_id', id!).order('transfer_date', { ascending: false }),
      supabase.from('loan_allowed_bank_details').select('party_role, purpose').eq('loan_id', id!),
    ]);
    setLoan(loanRes.data);
    setSignatures(sigRes.data || []);
    setTranches(trancheRes.data || []);
    setScheduleItems(schedRes.data || []);
    setPayments(payRes.data || []);
    setAllowedDetails(allowedRes.data || []);
    setLoading(false);

    if (loanRes.data?.signature_scheme_requested === 'UNEP_WITH_APPENDIX_6' && user) {
      await refreshEdoAcceptance(loanRes.data, user.id);
    }

    if (loanRes.data && loanRes.data.status === 'fully_signed') {
      const hasConfirmedTranche = (trancheRes.data || []).some(t => t.status === 'confirmed');
      if (hasConfirmedTranche) {
        await supabase.from('loans').update({ status: 'active' }).eq('id', id!);
        setLoan(prev => prev ? { ...prev, status: 'active' } : prev);
      }
    }

    if (loanRes.data && loanRes.data.status === 'active') {
      const ct = (trancheRes.data || []).filter(t => t.status === 'confirmed');
      const td = ct.reduce((s, t) => s + Number(t.amount), 0);
      const cp = (payRes.data || []).filter(p => p.status === 'confirmed');
      const tr = cp.reduce((s, p) => s + Number(p.transfer_amount), 0);
      const loanLimit = Number(loanRes.data.amount);
      if (td > 0 && tr >= td) {
        // Outstanding debt is zero — but is the loan fully disbursed?
        if (td >= loanLimit) {
          // Fully disbursed AND fully repaid → truly closed
          await supabase.from('loans').update({ status: 'repaid' }).eq('id', id!);
          setLoan(prev => prev ? { ...prev, status: 'repaid' } : prev);
        } else {
          // Zero debt but more tranches can be issued → return to signed_no_debt
          await supabase.from('loans').update({ status: 'signed_no_debt' }).eq('id', id!);
          setLoan(prev => prev ? { ...prev, status: 'signed_no_debt' } : prev);
        }
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
  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');
  const isLender = user?.id === loan.lender_id;
  const isBorrower = user?.id === loan.borrower_id;
  const isUnepFlow = loan.signature_scheme_requested === 'UNEP_WITH_APPENDIX_6';
  const baseCanSign = (isLender && !lenderSig) || (isBorrower && !borrowerSig);
  const unepReady = !isUnepFlow || (edoAcceptedByUser && edoAcceptedByCounterparty);
  const canSign = baseCanSign && unepReady;
  const canSend = isLender && !loan.borrower_id;
  const hasSchedule = ['installments_fixed', 'installments_variable'].includes(loan.repayment_schedule_type);

  const confirmedTranches = tranches.filter(t => t.status === 'confirmed');
  const totalDisbursed = confirmedTranches.reduce((s, t) => s + Number(t.amount), 0);
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalRepaid = confirmedPayments.reduce((s, p) => s + Number(p.transfer_amount), 0);
  const outstanding = Math.max(0, totalDisbursed - totalRepaid);

  // Next-action logic: show post-sign CTA when signed and no outstanding debt
  const isSignedPhase = ['fully_signed', 'signed_no_debt'].includes(loan.status);
  const showPostSignAction = isSignedPhase && outstanding === 0;
  // Lender needs disbursement details from both sides to create a tranche
  const lenderHasDisbursement = allowedDetails.some(d => d.party_role === 'lender' && d.purpose === 'disbursement');
  const borrowerHasDisbursement = allowedDetails.some(d => d.party_role === 'borrower' && d.purpose === 'disbursement');
  const bankDetailsReady = lenderHasDisbursement && borrowerHasDisbursement;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-3">
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

        {/* Summary */}
        <div className="card-elevated p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold font-display">{Number(loan.amount).toLocaleString('ru-RU')} ₽</p>
            <p className="text-xs text-muted-foreground">
              {loan.interest_mode === 'fixed_rate' ? `${Number(loan.interest_rate)}%` : 'Без %'}
              {' · до '}
              {new Date(loan.repayment_date).toLocaleDateString('ru-RU')}
            </p>
          </div>
          {totalDisbursed > 0 && (
            <div className="flex gap-4 pt-3 mt-3 border-t border-border/50 text-xs">
              <div><span className="text-muted-foreground">Выдано </span><span className="font-semibold text-primary">{totalDisbursed.toLocaleString('ru-RU')} ₽</span></div>
              <div><span className="text-muted-foreground">Погашено </span><span className="font-semibold">{totalRepaid.toLocaleString('ru-RU')} ₽</span></div>
              <div><span className="text-muted-foreground">Остаток </span><span className={`font-semibold ${outstanding > 0 ? 'text-warning' : 'text-primary'}`}>{outstanding.toLocaleString('ru-RU')} ₽</span></div>
            </div>
          )}
        </div>

        {/* Primary actions */}
        {canSend && (
          <Button onClick={() => setShowSend(true)} className="w-full gap-2 rounded-lg h-9 text-xs">
            <Send className="w-3.5 h-3.5" />
            Отправить заёмщику
          </Button>
        )}

        {isUnepFlow && baseCanSign && !unepReady && (
          <>
            <EdoRegulationAcceptance
              userId={user!.id}
              loanId={loan.id}
              onAccepted={() => loan && user && refreshEdoAcceptance(loan, user.id)}
            />
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs text-warning font-medium mb-0.5">Подписание заблокировано</p>
              <p className="text-[10px] text-muted-foreground">
                Для подписания по схеме УНЭП обе стороны должны принять Регламент ЭДО.
              </p>
            </div>
          </>
        )}

        {canSign && (
          <Button onClick={() => setShowSignature(true)} className="w-full gap-2 rounded-lg h-9 text-xs">
            <PenTool className="w-3.5 h-3.5" />
            Подписать как {isLender ? 'займодавец' : 'заёмщик'}
          </Button>
        )}

        {/* Post-sign primary action */}
        {showPostSignAction && (
          <NextActionBlock
            isLender={isLender}
            bankDetailsReady={bankDetailsReady}
            onOpenBankDetails={() => setExpanded(prev => ({ ...prev, bank: true }))}
            onCreateTranche={() => setShowCreateTranche(true)}
          />
        )}

        {/* Timeline */}
        <Section title="Хронология" defaultOpen>
          <LoanTimeline
            loan={loan}
            signatures={signatures}
            tranches={tranches}
            payments={payments}
            edoAccepted={edoAcceptedByUser && edoAcceptedByCounterparty}
          />
        </Section>

        {/* Tranches — always visible when relevant */}
        <div className="card-elevated p-4">
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
          />
        </div>

        {/* Schedule */}
        {hasSchedule && (
          <CollapsibleCard
            title="График платежей"
            open={expanded.schedule}
            onToggle={() => toggle('schedule')}
          >
            <PaymentSchedule
              items={scheduleItems}
              loanId={loan.id}
              isLender={isLender}
              loanStatus={loan.status}
              repaymentScheduleType={loan.repayment_schedule_type}
              onRefresh={fetchAll}
            />
          </CollapsibleCard>
        )}

        {/* Repayments */}
        <div className="card-elevated p-4">
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
          />
        </div>

        {/* Transfer Evidence */}
        <TransferEvidence tranches={tranches} payments={payments} />

        {/* Bank Details — lower priority */}
        <CollapsibleCard
          title="Реквизиты"
          icon={<CreditCard className="w-3.5 h-3.5" />}
          open={expanded.bank}
          onToggle={() => toggle('bank')}
        >
          <AllowedBankDetailsSelector
            loanId={loan.id}
            lenderId={loan.lender_id}
            borrowerId={loan.borrower_id}
            loanStatus={loan.status}
            onUpdate={fetchAll}
          />
        </CollapsibleCard>

        {/* Signatures */}
        <CollapsibleCard
          title="Подписи"
          icon={<Shield className="w-3.5 h-3.5" />}
          open={expanded.signatures}
          onToggle={() => toggle('signatures')}
        >
          <p className="text-[10px] text-muted-foreground mb-3">Электронная подпись (в MVP — визуальная ПЭП-заглушка)</p>
          <div className="grid grid-cols-2 gap-2">
            <SigBox label="Займодавец" sig={lenderSig} />
            <SigBox label="Заёмщик" sig={borrowerSig} />
          </div>
        </CollapsibleCard>

        {/* Terms — low priority */}
        <CollapsibleCard
          title="Условия"
          open={expanded.terms}
          onToggle={() => toggle('terms')}
        >
          <div className="space-y-1.5 text-xs">
            <Row label="Тип" value={INTEREST_MODE_LABELS[loan.interest_mode] || loan.interest_mode} />
            {loan.interest_mode === 'fixed_rate' && <Row label="Ставка" value={`${Number(loan.interest_rate)}% годовых`} />}
            <Row label="Неустойка" value={`${Number(loan.penalty_rate)}%/день`} />
            <Row label="График" value={SCHEDULE_TYPE_LABELS[loan.repayment_schedule_type] || loan.repayment_schedule_type} />
            <Row label="Дата выдачи" value={formatDateSafe(loan.issue_date)} />
            <Row label="Срок возврата" value={formatDateSafe(loan.repayment_date)} />
            <Row label="Город" value={loan.city} />
            <Row label="Займодавец" value={loan.lender_name} />
            <Row label="Заёмщик" value={loan.borrower_name} />
          </div>
        </CollapsibleCard>

        {/* Documents link — lowest priority */}
        <button
          onClick={() => navigate(`/documents?loan=${loan.id}`)}
          className="w-full card-elevated p-3 flex items-center gap-2 text-left hover:border-border transition-colors group"
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium flex-1">Документы</span>
          <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">Открыть →</span>
        </button>
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
      {showCreateTranche && isLender && loan && (
        <CreateTrancheModal
          loanId={loan.id}
          userId={user!.id}
          lenderId={loan.lender_id}
          borrowerId={loan.borrower_id}
          nextTrancheNumber={tranches.length > 0 ? Math.max(...tranches.map(t => t.tranche_number)) + 1 : 1}
          contractNumber={loan.contract_number}
          onClose={() => setShowCreateTranche(false)}
          onSuccess={fetchAll}
        />
      )}
    </AppLayout>
  );
};

/* --- Helper components --- */

const Section = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-elevated">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
};

const CollapsibleCard = ({ title, icon, open, onToggle, children }: {
  title: string; icon?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode;
}) => (
  <div className="card-elevated">
    <button onClick={onToggle} className="w-full flex items-center justify-between p-3 text-left">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {title}
      </span>
      {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
    {open && <div className="px-3 pb-3">{children}</div>}
  </div>
);

const SigBox = ({ label, sig }: { label: string; sig?: Signature | null }) => (
  <div className={`rounded-lg border p-2.5 ${sig ? 'border-primary/30 bg-primary/5' : 'border-dashed border-border'}`}>
    <p className="text-[10px] text-muted-foreground uppercase mb-1">{label}</p>
    {sig ? (
      <>
        <img src={sig.signature_data} alt="" className="h-8 mb-0.5" />
        <p className="text-[10px] text-muted-foreground">{new Date(sig.signed_at).toLocaleDateString('ru-RU')}</p>
      </>
    ) : (
      <p className="text-[10px] text-muted-foreground py-2 text-center">—</p>
    )}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const NextActionBlock = ({ isLender, bankDetailsReady, onOpenBankDetails, onCreateTranche }: {
  isLender: boolean;
  bankDetailsReady: boolean;
  onOpenBankDetails: () => void;
  onCreateTranche: () => void;
}) => {
  if (isLender) {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          <p className="text-sm font-semibold">Договор подписан — пора перевести деньги</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {bankDetailsReady
            ? 'Реквизиты выбраны. Создайте транш и переведите средства заёмщику.'
            : 'Сначала выберите реквизиты для перевода, затем создайте транш.'}
        </p>
        <div className="flex gap-2 pt-1">
          {bankDetailsReady ? (
            <>
              <Button size="sm" className="rounded-lg text-xs gap-1.5" onClick={onCreateTranche}>
                <Banknote className="w-3.5 h-3.5" />
                Выдать транш
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1" onClick={onOpenBankDetails}>
                <CreditCard className="w-3.5 h-3.5" />
                Реквизиты
              </Button>
            </>
          ) : (
            <Button size="sm" className="rounded-lg text-xs gap-1.5" onClick={onOpenBankDetails}>
              <CreditCard className="w-3.5 h-3.5" />
              Выбрать реквизиты для перевода
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">Ожидаем перевод от займодавца</p>
          <p className="text-xs text-muted-foreground">Договор подписан. Когда займодавец переведёт средства, вам нужно будет подтвердить получение.</p>
        </div>
      </div>
    </div>
  );
};

export default LoanDetails;
