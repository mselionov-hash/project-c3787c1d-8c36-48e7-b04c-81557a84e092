import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Banknote, Copy, CheckCircle2, Upload, Loader2, Smartphone, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import BorrowerPaymentMethodPicker from '@/components/BorrowerPaymentMethodPicker';
import { generateSbpEmvQr } from '@/lib/emvco-qr';
import type { Tables } from '@/integrations/supabase/types';

type Loan = Tables<'loans'>;
type Payment = Tables<'loan_payments'>;

interface PaymentMethod {
  id: string;
  method_type: 'sbp' | 'card';
  label: string;
  phone: string | null;
  card_number: string | null;
  card_holder: string | null;
  bank_name: string | null;
  is_default: boolean;
}

interface SbpPaymentSectionProps {
  loan: Loan;
  payments: Payment[];
  onSuccess: () => void;
}

const SbpPaymentSection = ({ loan, payments, onSuccess }: SbpPaymentSectionProps) => {
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const isLender = user?.id === loan.lender_id;
  const loanNumber = loan.id.slice(0, 8).toUpperCase();
  const confirmedPayment = payments.find(p => p.status === 'confirmed');
  const canPay = isLender && ['fully_signed', 'awaiting_payment', 'draft', 'signed_by_lender', 'signed_by_borrower'].includes(loan.status) && !confirmedPayment;

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} скопировано`);
    setTimeout(() => setCopied(null), 2000);
  };

  const paymentComment = `По договору займа №${loanNumber}`;

  const sbpLink = selectedMethod?.phone
    ? `sbp://pay?phone=${encodeURIComponent(selectedMethod.phone)}&amount=${loan.amount}&comment=${encodeURIComponent(paymentComment)}`
    : '';

  const sberLink = selectedMethod?.phone
    ? `sberbankonline://transfer?recipientPhone=${encodeURIComponent(selectedMethod.phone)}&amount=${loan.amount}&currency=RUB&comment=${encodeURIComponent(paymentComment)}`
    : '';

  const tbankLink = selectedMethod?.phone
    ? `bank100000000004://transfer?phone=${encodeURIComponent(selectedMethod.phone)}&amount=${loan.amount}&comment=${encodeURIComponent(paymentComment)}`
    : '';

  const [qrLink, setQrLink] = useState<string>('');

  const handleOpenSbp = () => {
    if (!sbpLink) {
      toast.error('Выберите СБП реквизит с номером телефона');
      return;
    }
    window.location.href = sbpLink;
  };

  const handleOpenSber = () => {
    if (!sberLink) {
      toast.error('Выберите реквизит с номером телефона');
      return;
    }
    window.location.href = sberLink;
  };

  const handleOpenTbank = () => {
    if (!tbankLink) {
      toast.error('Выберите реквизит с номером телефона');
      return;
    }
    window.location.href = tbankLink;
  };

  const handleConfirmPayment = async () => {
    if (!user || !transactionId.trim()) {
      toast.error('Укажите ID транзакции');
      return;
    }
    if (!selectedMethod) {
      toast.error('Выберите реквизиты для оплаты');
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
        transfer_method: selectedMethod.method_type,
        transfer_amount: Number(loan.amount),
        bank_name: selectedMethod.bank_name || (selectedMethod.method_type === 'sbp' ? 'СБП' : 'Карта'),
        payment_reference: paymentComment,
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

  // Build payment details based on selected method
  const paymentDetails = selectedMethod ? [
    { label: 'Номер договора', value: loanNumber },
    { label: 'Сумма', value: `${Number(loan.amount).toLocaleString('ru-RU')} ₽` },
    ...(selectedMethod.method_type === 'sbp'
      ? [{ label: 'Телефон (СБП)', value: selectedMethod.phone || '' }]
      : [
          { label: 'Номер карты', value: selectedMethod.card_number || '' },
          ...(selectedMethod.card_holder ? [{ label: 'Держатель', value: selectedMethod.card_holder }] : []),
        ]),
    ...(selectedMethod.bank_name ? [{ label: 'Банк', value: selectedMethod.bank_name }] : []),
    { label: 'Назначение', value: paymentComment },
  ] : [];

  return (
    <div className="card-elevated p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">Оплата займа</h3>
          <p className="text-xs text-muted-foreground">Выберите реквизиты заёмщика</p>
        </div>
      </div>

      {/* Borrower payment methods picker */}
      {loan.borrower_id ? (
        <div className="mb-6">
          <BorrowerPaymentMethodPicker
            borrowerId={loan.borrower_id}
            loanAmount={Number(loan.amount)}
            loanNumber={loanNumber}
            onSelectMethod={setSelectedMethod}
          />
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-sm mb-6">
          <p className="font-semibold text-warning">Заёмщик не привязан</p>
          <p className="text-muted-foreground text-xs mt-1">Сначала отправьте договор заёмщику</p>
        </div>
      )}

      {/* Payment details with copy */}
      {selectedMethod && paymentDetails.length > 0 && (
        <>
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
        </>
      )}

      {canPay && selectedMethod && (
        <>
          {/* SBP button if method is SBP */}
          {selectedMethod.method_type === 'sbp' && selectedMethod.phone && (
            <div className="space-y-3 mb-6">
              {/* Bank-specific deep links */}
              <Button
                onClick={handleOpenSber}
                className="w-full h-12 rounded-xl gap-2 text-sm font-semibold bg-[hsl(120,60%,35%)] hover:bg-[hsl(120,60%,30%)] text-white"
              >
                <Smartphone className="w-4 h-4" />
                Перевести через Сбер
              </Button>

              <Button
                onClick={handleOpenTbank}
                className="w-full h-12 rounded-xl gap-2 text-sm font-semibold bg-[hsl(45,90%,50%)] hover:bg-[hsl(45,90%,45%)] text-[hsl(0,0%,10%)]"
              >
                <Smartphone className="w-4 h-4" />
                Перевести через Т-Банк
              </Button>

              <Button
                onClick={handleOpenSbp}
                variant="outline"
                className="w-full h-12 rounded-xl gap-2 text-sm font-semibold"
              >
                <Smartphone className="w-4 h-4" />
                Оплатить через СБП (любой банк)
              </Button>

              {/* QR buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl gap-2 text-xs"
                  onClick={() => { setQrLink(sberLink); setShowQr(!showQr || qrLink !== sberLink); }}
                >
                  <QrCode className="w-4 h-4" />
                  QR Сбер
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl gap-2 text-xs"
                  onClick={() => { setShowQr(!showQr || qrLink !== 'emvco'); setQrLink('emvco'); }}
                >
                  <QrCode className="w-4 h-4" />
                  QR СБП (NSPK)
                </Button>
              </div>

              {showQr && selectedMethod?.phone && (
                <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {qrLink === 'emvco' ? 'QR СБП (NSPK EMVCo)' : 'QR для Сбербанк'}
                  </p>
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG
                      value={
                        qrLink === 'emvco'
                          ? generateSbpEmvQr({
                              phone: selectedMethod.phone,
                              amount: Number(loan.amount),
                              recipientName: loan.borrower_name,
                              city: loan.city,
                              comment: paymentComment,
                            })
                          : qrLink
                      }
                      size={200}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center max-w-[260px]">
                    {qrLink === 'emvco'
                      ? 'Отсканируйте банковским приложением (Сбер, Т-Банк, ВТБ и др.)'
                      : 'Отсканируйте камерой смартфона — откроется приложение Сбербанк'}
                  </p>
                </div>
              )}
            </div>
          )}

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
