import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Banknote, Copy, ExternalLink, CheckCircle2, Upload, Loader2, Smartphone } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type Payment = Tables<'loan_payments'>;

interface SbpPaymentSectionProps {
  loan: Loan;
  payments: Payment[];
  onSuccess: () => void;
}

const SbpPaymentSection = ({ loan, payments, onSuccess }: SbpPaymentSectionProps) => {
  const { user } = useAuth();
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [loadingPhone, setLoadingPhone] = useState(true);
  const [transactionId, setTransactionId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const isLender = user?.id === loan.lender_id;
  const loanNumber = loan.id.slice(0, 8).toUpperCase();
  const confirmedPayment = payments.find(p => p.status === 'confirmed');
  const canPay = isLender && ['fully_signed', 'awaiting_payment', 'draft', 'signed_by_lender', 'signed_by_borrower'].includes(loan.status) && !confirmedPayment;

  useEffect(() => {
    if (loan.borrower_id) {
      supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', loan.borrower_id)
        .single()
        .then(({ data }) => {
          setBorrowerPhone((data as any)?.phone || '');
          setLoadingPhone(false);
        });
    } else {
      setLoadingPhone(false);
    }
  }, [loan.borrower_id]);

  const sbpLink = borrowerPhone
    ? `sbp://pay?phone=${encodeURIComponent(borrowerPhone)}&amount=${loan.amount}&comment=${encodeURIComponent(`Перевод по договору займа №${loanNumber}`)}`
    : '';

  const handleOpenSbp = () => {
    if (!sbpLink) {
      toast.error('Номер телефона заёмщика не указан');
      return;
    }
    window.location.href = sbpLink;
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} скопировано`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmPayment = async () => {
    if (!user || !transactionId.trim()) {
      toast.error('Укажите ID транзакции');
      return;
    }

    setSubmitting(true);
    try {
      let screenshotUrl = '';
      if (screenshot) {
        const ext = screenshot.name.split('.').pop();
        const path = `${loan.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-screenshots')
          .upload(path, screenshot);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('payment-screenshots')
          .getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('loan_payments').insert({
        loan_id: loan.id,
        payer_id: user.id,
        transfer_method: 'sbp',
        transfer_amount: Number(loan.amount),
        bank_name: 'СБП',
        payment_reference: `Перевод по договору займа №${loanNumber}`,
        transaction_id: transactionId.trim(),
        transfer_date: transferDate,
        screenshot_url: screenshotUrl,
        status: 'confirmed',
      });
      if (error) throw error;

      await supabase.from('loans').update({ status: 'active' }).eq('id', loan.id);

      toast.success('Платёж подтверждён! Статус договора обновлён.');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка подтверждения платежа');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLender) return null;

  const inputClass = "h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card";

  const paymentDetails = [
    { label: 'Номер договора', value: loanNumber },
    { label: 'Сумма', value: `${Number(loan.amount).toLocaleString('ru-RU')} ₽` },
    { label: 'Телефон заёмщика', value: borrowerPhone || 'Не указан' },
    { label: 'Назначение', value: `Перевод по договору займа №${loanNumber}` },
  ];

  return (
    <div className="card-elevated p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">Оплата через СБП</h3>
          <p className="text-xs text-muted-foreground">Система Быстрых Платежей</p>
        </div>
      </div>

      {/* Payment details with copy */}
      <div className="space-y-3 mb-6">
        {paymentDetails.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium text-sm">{value}</p>
            </div>
            <button
              onClick={() => handleCopy(value, label)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              {copied === label ? (
                <CheckCircle2 className="w-4 h-4 text-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Copy all details */}
      <Button
        variant="outline"
        className="w-full rounded-xl gap-2 mb-4"
        onClick={() => {
          const allDetails = paymentDetails.map(d => `${d.label}: ${d.value}`).join('\n');
          handleCopy(allDetails, 'Все реквизиты');
        }}
      >
        <Copy className="w-4 h-4" />
        Скопировать все реквизиты
      </Button>

      {canPay && (
        <>
          {/* SBP button */}
          <Button
            onClick={handleOpenSbp}
            className="w-full h-12 rounded-xl gap-2 text-sm font-semibold mb-6"
            disabled={!borrowerPhone || loadingPhone}
          >
            <ExternalLink className="w-4 h-4" />
            Оплатить через СБП
          </Button>

          {/* Payment confirmation */}
          <div className="border-t border-border/50 pt-6">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Подтверждение перевода
            </h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID транзакции *</Label>
                <Input
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="Номер операции из банка"
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата перевода</Label>
                <Input
                  type="date"
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Скриншот перевода</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setScreenshot(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`${inputClass} flex items-center gap-2 px-3 border rounded-xl cursor-pointer`}>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {screenshot ? screenshot.name : 'Выберите файл (необязательно)'}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConfirmPayment}
                disabled={submitting || !transactionId.trim()}
                className="w-full h-12 rounded-xl gap-2 text-sm font-semibold"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                Я отправил деньги
              </Button>
            </div>
          </div>
        </>
      )}

      {confirmedPayment && (
        <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <p className="font-semibold text-sm">Платёж подтверждён</p>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {confirmedPayment.transaction_id && <p>ID: {confirmedPayment.transaction_id}</p>}
            <p>Дата: {new Date(confirmedPayment.transfer_date).toLocaleDateString('ru-RU')}</p>
            <p>Сумма: {Number(confirmedPayment.transfer_amount).toLocaleString('ru-RU')} ₽</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SbpPaymentSection;
