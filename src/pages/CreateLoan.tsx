import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const CreateLoan = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const [lenderName, setLenderName] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [lenderPassport, setLenderPassport] = useState('');
  const [borrowerPassport, setBorrowerPassport] = useState('');
  const [lenderAddress, setLenderAddress] = useState('');
  const [borrowerAddress, setBorrowerAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [penaltyRate, setPenaltyRate] = useState('0.1');
  const [repaymentDate, setRepaymentDate] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [city, setCity] = useState('Москва');
  const [notes, setNotes] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!lenderName.trim() || !borrowerName.trim() || !amount || !interestRate || !repaymentDate) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('loans').insert({
        lender_id: user.id,
        lender_name: lenderName.trim(),
        borrower_name: borrowerName.trim(),
        lender_passport: lenderPassport.trim(),
        borrower_passport: borrowerPassport.trim(),
        lender_address: lenderAddress.trim(),
        borrower_address: borrowerAddress.trim(),
        amount: parseFloat(amount),
        interest_rate: parseFloat(interestRate),
        penalty_rate: parseFloat(penaltyRate),
        repayment_date: repaymentDate,
        issue_date: issueDate,
        city: city.trim(),
        notes: notes.trim(),
        status: 'draft',
      }).select().single();

      if (error) throw error;
      toast.success('Договор создан!');
      navigate(`/loans/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания договора');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const inputClass = "h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-bold font-display">Новый договор займа</h1>
              <p className="text-xs text-muted-foreground">Заполните данные сторон и условия</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Lender section */}
          <section className="card-elevated p-7">
            <h2 className="text-lg font-bold font-display mb-5">Займодавец</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ФИО *</Label>
                <Input value={lenderName} onChange={e => setLenderName(e.target.value)} placeholder="Иванов Иван Иванович" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Паспорт</Label>
                <Input value={lenderPassport} onChange={e => setLenderPassport(e.target.value)} placeholder="Серия и номер" className={inputClass} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Адрес</Label>
                <Input value={lenderAddress} onChange={e => setLenderAddress(e.target.value)} placeholder="Адрес регистрации" className={inputClass} />
              </div>
            </div>
          </section>

          {/* Borrower section */}
          <section className="card-elevated p-7">
            <h2 className="text-lg font-bold font-display mb-5">Заёмщик</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ФИО *</Label>
                <Input value={borrowerName} onChange={e => setBorrowerName(e.target.value)} placeholder="Петров Пётр Петрович" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Паспорт</Label>
                <Input value={borrowerPassport} onChange={e => setBorrowerPassport(e.target.value)} placeholder="Серия и номер" className={inputClass} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Адрес</Label>
                <Input value={borrowerAddress} onChange={e => setBorrowerAddress(e.target.value)} placeholder="Адрес регистрации" className={inputClass} />
              </div>
            </div>
          </section>

          {/* Loan terms */}
          <section className="card-elevated p-7">
            <h2 className="text-lg font-bold font-display mb-5">Условия займа</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Сумма (₽) *</Label>
                <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100 000" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ставка (%) *</Label>
                <Input type="number" min="0" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="12" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Неустойка (%/день)</Label>
                <Input type="number" min="0" step="0.01" value={penaltyRate} onChange={e => setPenaltyRate(e.target.value)} placeholder="0.1" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Город</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Москва" className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата выдачи</Label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата возврата *</Label>
                <Input type="date" value={repaymentDate} onChange={e => setRepaymentDate(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Примечания</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительные условия..." rows={3} className="rounded-xl bg-muted/50 border-border/50 focus:bg-card" />
              </div>
            </div>
          </section>

          <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl gap-2 text-sm font-semibold">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Создать договор
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreateLoan;
