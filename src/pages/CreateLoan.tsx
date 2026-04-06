import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { ArrowLeft, ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateSafe } from '@/lib/date-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ── Constants ── */

const INTEREST_MODES = [
  { value: 'interest_free', label: 'Беспроцентный' },
  { value: 'fixed_rate', label: 'Фиксированная ставка' },
] as const;

const INTEREST_PAYMENT_SCHEDULES = [
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'at_maturity', label: 'В конце срока' },
  { value: 'with_each_repayment', label: 'С каждым погашением' },
] as const;

const REPAYMENT_SCHEDULE_TYPES = [
  { value: 'no_schedule_single_deadline', label: 'Единый срок возврата' },
  { value: 'installments_fixed', label: 'Фиксированные платежи' },
  { value: 'installments_variable', label: 'Переменные платежи' },
] as const;

const SIGNATURE_SCHEMES = [
  {
    value: 'UKEP_ONLY',
    label: 'УКЭП (усиленная квалифицированная)',
    description: 'Квалифицированная электронная подпись. В текущей версии платформы реализована как визуальная подпись с фиксацией IP и времени (ПЭП-заглушка).',
  },
  {
    value: 'UNEP_WITH_APPENDIX_6',
    label: 'УНЭП с Приложением 6',
    description: 'Усиленная неквалифицированная электронная подпись. Требует принятия Регламента ЭДО обеими сторонами и включения Приложения 6 в пакет подписания.',
  },
] as const;

const STEPS = ['Заёмщик', 'Сумма и срок', 'Дополнительно', 'Проверка'];

const DEFAULTS_KEY = 'loan_create_defaults';

/* ── Saved defaults helpers ── */

interface SavedDefaults {
  city?: string;
  interestMode?: string;
  repaymentScheduleType?: string;
  repaymentTermMonths?: number;
  signatureScheme?: string;
  penaltyRate?: string;
  earlyRepaymentNoticeDays?: string;
}

function loadDefaults(): SavedDefaults {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDefaults(d: SavedDefaults) {
  try {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
  } catch {}
}

function monthsBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/* ── Component ── */

const CreateLoan = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState(0);

  const saved = loadDefaults();

  // Auto-filled from profile
  const [lenderName, setLenderName] = useState('');
  const [lenderPassport, setLenderPassport] = useState('');
  const [lenderAddress, setLenderAddress] = useState('');

  // User input with safe defaults from last loan
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [repaymentDate, setRepaymentDate] = useState('');
  const [interestMode, setInterestMode] = useState(saved.interestMode || 'interest_free');
  const [interestRate, setInterestRate] = useState('');
  const [interestPaymentSchedule, setInterestPaymentSchedule] = useState('at_maturity');
  const [repaymentScheduleType, setRepaymentScheduleType] = useState(saved.repaymentScheduleType || 'no_schedule_single_deadline');
  const [penaltyRate, setPenaltyRate] = useState(saved.penaltyRate || '0.1');
  const [earlyRepaymentNoticeDays, setEarlyRepaymentNoticeDays] = useState(saved.earlyRepaymentNoticeDays || '30');
  const [city, setCity] = useState(saved.city || 'Москва');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [signatureScheme, setSignatureScheme] = useState(saved.signatureScheme || 'UKEP_ONLY');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setLenderName(profile.full_name || '');
      setLenderPassport(`${profile.passport_series || ''} ${profile.passport_number || ''}`.trim());
      setLenderAddress(profile.address || '');
    }
  }, [profile]);

  // Default repayment date from saved term or 1 year
  useEffect(() => {
    if (!repaymentDate) {
      const d = new Date();
      const months = saved.repaymentTermMonths ?? 12;
      d.setMonth(d.getMonth() + months);
      setRepaymentDate(d.toISOString().split('T')[0]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!user) return;
    if (!borrowerName.trim() || !amount || !repaymentDate) {
      toast.error('Заполните обязательные поля');
      return;
    }

    // Save defaults for next time
    saveDefaults({
      city: city.trim(),
      interestMode,
      repaymentScheduleType,
      repaymentTermMonths: monthsBetween(issueDate, repaymentDate),
      signatureScheme,
      penaltyRate,
      earlyRepaymentNoticeDays,
    });

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('loans').insert({
        lender_id: user.id,
        lender_name: lenderName.trim(),
        borrower_name: borrowerName.trim(),
        lender_passport: lenderPassport.trim(),
        borrower_passport: '',
        lender_address: lenderAddress.trim(),
        borrower_address: '',
        amount: parseFloat(amount),
        interest_rate: interestMode === 'fixed_rate' ? parseFloat(interestRate) : 0,
        penalty_rate: parseFloat(penaltyRate),
        repayment_date: repaymentDate,
        issue_date: issueDate,
        city: city.trim(),
        notes: notes.trim(),
        status: 'draft',
        interest_mode: interestMode,
        interest_payment_schedule: interestMode === 'fixed_rate' ? interestPaymentSchedule : null,
        repayment_schedule_type: repaymentScheduleType,
        early_repayment_notice_days: parseInt(earlyRepaymentNoticeDays, 10) || 30,
        signature_scheme_requested: signatureScheme,
      }).select().single();

      if (error) throw error;
      toast.success('Займ создан');
      navigate(`/loans/${data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const inputClass = "h-10 rounded-lg bg-secondary border-border/50 text-sm";

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold font-display">Новый займ</h1>
            <p className="text-xs text-muted-foreground">Шаг {step + 1} из {STEPS.length}: {STEPS[step]}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
          ))}
        </div>

        {/* Step 1: Borrower */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="card-elevated p-5">
              <p className="text-xs text-muted-foreground mb-3">Займодавец (вы)</p>
              <p className="text-sm font-medium">{lenderName || 'Заполните профиль'}</p>
              {lenderPassport && <p className="text-xs text-muted-foreground mt-0.5">Паспорт: {lenderPassport}</p>}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">ФИО заёмщика *</Label>
                <Input value={borrowerName} onChange={e => setBorrowerName(e.target.value)} placeholder="Петров Пётр Петрович" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email заёмщика (необязательно)</Label>
                <Input value={borrowerEmail} onChange={e => setBorrowerEmail(e.target.value)} placeholder="borrower@email.com" className={inputClass} />
                <p className="text-[10px] text-muted-foreground">Для отправки приглашения подписать договор</p>
              </div>
            </div>
            <Button onClick={() => setStep(1)} disabled={!borrowerName.trim()} className="w-full gap-2 rounded-lg h-10 text-sm mt-4">
              Далее <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Amount & Terms */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Сумма займа (₽) *</Label>
              <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100 000" className={`${inputClass} text-lg font-bold`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Дата возврата *</Label>
              <Input type="date" value={repaymentDate} onChange={e => setRepaymentDate(e.target.value)} className={inputClass} />
              {saved.repaymentTermMonths && (
                <p className="text-[10px] text-muted-foreground">Подставлен срок из прошлого займа ({saved.repaymentTermMonths} мес.)</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Тип процентов</Label>
              <Select value={interestMode} onValueChange={setInterestMode}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTEREST_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {interestMode === 'fixed_rate' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ставка (% годовых) *</Label>
                  <Input type="number" min="0" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="12" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Выплата процентов</Label>
                  <Select value={interestPaymentSchedule} onValueChange={setInterestPaymentSchedule}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTEREST_PAYMENT_SCHEDULES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button onClick={() => setStep(2)} disabled={!amount || !repaymentDate} className="w-full gap-2 rounded-lg h-10 text-sm mt-4">
              Далее <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 3: Advanced */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">График погашения</Label>
              <Select value={repaymentScheduleType} onValueChange={setRepaymentScheduleType}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPAYMENT_SCHEDULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Signature scheme */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Схема подписания</Label>
              <div className="space-y-2">
                {SIGNATURE_SCHEMES.map(scheme => (
                  <label
                    key={scheme.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      signatureScheme === scheme.value
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/50 hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="signatureScheme"
                      value={scheme.value}
                      checked={signatureScheme === scheme.value}
                      onChange={() => setSignatureScheme(scheme.value)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium">{scheme.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{scheme.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Дополнительные условия
            </button>

            {showAdvanced && (
              <div className="space-y-3 border-l-2 border-border pl-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Неустойка (%/день)</Label>
                  <Input type="number" min="0" step="0.01" value={penaltyRate} onChange={e => setPenaltyRate(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Досрочное погашение (дней уведомления)</Label>
                  <Input type="number" min="0" value={earlyRepaymentNoticeDays} onChange={e => setEarlyRepaymentNoticeDays(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Город</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Дата выдачи</Label>
                  <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Примечания</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="rounded-lg bg-secondary border-border/50 text-sm" />
                </div>
              </div>
            )}

            <Button onClick={() => setStep(3)} className="w-full gap-2 rounded-lg h-10 text-sm mt-4">
              Проверить <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="card-elevated p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Займодавец</span>
                <span className="font-medium">{lenderName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Заёмщик</span>
                <span className="font-medium">{borrowerName}</span>
              </div>
              <div className="border-t border-border/50 pt-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Сумма</span>
                <span className="font-bold text-lg">{Number(amount).toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Возврат до</span>
                <span className="font-medium">{formatDateSafe(repaymentDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Проценты</span>
                <span className="font-medium">
                  {interestMode === 'fixed_rate' ? `${interestRate}% годовых` : 'Без процентов'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Неустойка</span>
                <span className="font-medium">{penaltyRate}%/день</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Город</span>
                <span className="font-medium">{city}</span>
              </div>
              <div className="border-t border-border/50 pt-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Подписание</span>
                <span className="font-medium">
                  {signatureScheme === 'UNEP_WITH_APPENDIX_6' ? 'УНЭП + Приложение 6' : 'УКЭП'}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              После создания вы сможете добавить банковские реквизиты и отправить договор заёмщику
            </p>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2 rounded-lg h-11 text-sm font-semibold">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Создать займ
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CreateLoan;
