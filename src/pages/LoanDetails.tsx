import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { generateLoanPDF } from '@/lib/pdf';
import SignaturePad from '@/components/SignaturePad';
import SendLoanModal from '@/components/SendLoanModal';
import SbpPaymentSection from '@/components/SbpPaymentSection';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, PenTool, CheckCircle2, Clock, FileText,
  User, Calendar, Percent, MapPin, AlertTriangle, Shield, Send
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type Signature = Tables<'loan_signatures'>;

const statusConfig: Record<string, { label: string; icon: any; class: string }> = {
  draft: { label: 'Черновик', icon: Clock, class: 'bg-muted text-muted-foreground' },
  awaiting_signature: { label: 'Ожидает подписи', icon: PenTool, class: 'bg-warning/10 text-warning' },
  signed_by_lender: { label: 'Подписан займодавцем', icon: PenTool, class: 'bg-primary/10 text-primary' },
  signed_by_borrower: { label: 'Подписан заёмщиком', icon: PenTool, class: 'bg-primary/10 text-primary' },
  fully_signed: { label: 'Полностью подписан', icon: CheckCircle2, class: 'bg-accent/10 text-accent' },
  active: { label: 'Активный', icon: CheckCircle2, class: 'bg-accent/10 text-accent' },
  completed: { label: 'Завершён', icon: CheckCircle2, class: 'bg-muted text-muted-foreground' },
  overdue: { label: 'Просрочен', icon: AlertTriangle, class: 'bg-destructive/10 text-destructive' },
};

const LoanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
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
    const [loanRes, sigRes] = await Promise.all([
      supabase.from('loans').select('*').eq('id', id!).single(),
      supabase.from('loan_signatures').select('*').eq('loan_id', id!),
    ]);
    setLoan(loanRes.data);
    setSignatures(sigRes.data || []);
    setLoading(false);
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
      } catch {}

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
    } catch (err: any) {
      toast.error(err.message || 'Ошибка подписи');
    }
  };

  const handleDownloadPDF = () => {
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

  if (loading || authLoading || !loan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const status = statusConfig[loan.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const totalAmount = Number(loan.amount) + (Number(loan.amount) * Number(loan.interest_rate)) / 100;
  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');
  const isLender = user?.id === loan.lender_id;
  const isBorrower = user?.id === loan.borrower_id;
  const canSign = (isLender && !lenderSig) || (isBorrower && !borrowerSig);
  const canSend = isLender && !loan.borrower_id;

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
              <p className="text-xs text-muted-foreground">№ {loan.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {canSend && (
              <Button onClick={() => setShowSend(true)} variant="outline" size="sm" className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Отправить</span>
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadPDF} size="sm" className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Скачать PDF</span>
            </Button>
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
              <p className="text-xs text-muted-foreground">Отправьте договор, чтобы заёмщик мог его подписать в своём личном кабинете</p>
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
                <span className="text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" />Ставка</span>
                <span className="font-medium">{Number(loan.interest_rate)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Сумма возврата</span>
                <span className="font-semibold text-accent">{totalAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Неустойка</span>
                <span className="font-medium">{Number(loan.penalty_rate)}%/день</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" />Дата выдачи</span>
                <span className="font-medium">{new Date(loan.issue_date).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" />Дата возврата</span>
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

        {/* Payment requisites */}
        <SbpPaymentSection loan={loan} onSuccess={fetchAll} />
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
