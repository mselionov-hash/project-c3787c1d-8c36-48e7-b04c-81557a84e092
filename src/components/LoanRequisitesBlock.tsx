import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Banknote, Copy, CheckCircle2, ExternalLink, QrCode, X, AlertTriangle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;

interface PaymentMethod {
  id: string;
  bank_name: string | null;
  transfer_link: string | null;
  qr_image_url: string | null;
  recipient_display_name: string | null;
  is_default: boolean;
  label: string;
}

interface LoanRequisitesBlockProps {
  loan: Loan;
  onSuccess: () => void;
}

export const LoanRequisitesBlock = ({ loan, onSuccess }: LoanRequisitesBlockProps) => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null);

  const isLender = user?.id === loan.lender_id;
  const loanNumber = loan.id.slice(0, 8).toUpperCase();
  const paymentComment = `По договору займа №${loanNumber}`;

  useEffect(() => {
    if (loan.borrower_id) fetchBorrowerMethods();
  }, [loan.borrower_id]);

  const fetchBorrowerMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', loan.borrower_id!)
      .order('is_default', { ascending: false });
    setMethods((data as unknown as PaymentMethod[]) || []);
    setLoading(false);
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} скопировано`);
    setTimeout(() => setCopied(null), 2000);
  };

  // Only show to lender (who pays the borrower)
  if (!isLender) return null;

  if (!loan.borrower_id) {
    return (
      <div className="card-elevated p-7">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Реквизиты для перевода</h3>
            <p className="text-xs text-muted-foreground">Информация о переводе</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-sm">
          <p className="font-semibold text-warning flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Заёмщик не привязан
          </p>
          <p className="text-muted-foreground text-xs mt-1">Сначала отправьте договор заёмщику</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card-elevated p-7">
        <p className="text-sm text-muted-foreground">Загрузка реквизитов...</p>
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="card-elevated p-7">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Реквизиты для перевода</h3>
            <p className="text-xs text-muted-foreground">Информация о переводе</p>
          </div>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">Заёмщик ещё не добавил реквизиты для перевода</p>
          <p className="text-xs text-muted-foreground mt-1">Попросите заёмщика добавить реквизиты в своём профиле</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">Реквизиты для перевода</h3>
          <p className="text-xs text-muted-foreground">Допустимые реквизиты для выдачи и погашения</p>
        </div>
      </div>

      <div className="space-y-4">
        {methods.map(m => (
          <div key={m.id} className={`p-4 rounded-xl border ${m.is_default ? 'border-accent/30 bg-accent/5' : 'border-border/40 bg-muted/30'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center">
                <Banknote className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{m.bank_name || m.label}</p>
                  {m.is_default && <span className="pill-badge bg-accent/10 text-accent text-[10px]">Основной</span>}
                </div>
                {m.recipient_display_name && (
                  <p className="text-xs text-muted-foreground">{m.recipient_display_name}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {m.transfer_link && (
                <Button
                  onClick={() => window.open(m.transfer_link!, '_blank', 'noopener')}
                  className="w-full h-11 rounded-xl gap-2 text-sm font-semibold"
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть ссылку банка
                </Button>
              )}

              {m.qr_image_url && (
                <Button
                  variant="outline"
                  onClick={() => setShowQr(m.qr_image_url)}
                  className="w-full h-11 rounded-xl gap-2 text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  Показать QR-код
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Payment comment - copyable */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Комментарий к переводу</p>
              <p className="font-medium text-sm">{paymentComment}</p>
            </div>
            <button
              onClick={() => handleCopy(paymentComment, 'Комментарий')}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              {copied === 'Комментарий' ? (
                <CheckCircle2 className="w-4 h-4 text-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Loan amount - copyable */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Сумма перевода</p>
              <p className="font-medium text-sm">{Number(loan.amount).toLocaleString('ru-RU')} ₽</p>
            </div>
            <button
              onClick={() => handleCopy(String(loan.amount), 'Сумма')}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              {copied === 'Сумма' ? (
                <CheckCircle2 className="w-4 h-4 text-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQr && (
        <div className="fixed inset-0 bg-foreground/15 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowQr(null)}>
          <div className="card-elevated p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm font-display">QR-код для оплаты</h4>
              <button onClick={() => setShowQr(null)} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={showQr} alt="QR-код" className="w-full max-w-[280px] mx-auto rounded-xl" />
            <p className="text-xs text-muted-foreground text-center mt-3">Отсканируйте QR-код камерой телефона или в банковском приложении</p>
          </div>
        </div>
      )}
    </div>
  );
};
