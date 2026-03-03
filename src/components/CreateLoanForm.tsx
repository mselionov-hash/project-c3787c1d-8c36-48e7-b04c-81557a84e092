import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveLoan } from '@/lib/store';
import { generateLoanPDF } from '@/lib/pdf';
import { Loan } from '@/lib/types';
import { toast } from 'sonner';
import { FileText, X } from 'lucide-react';

interface CreateLoanFormProps {
  currentUserName: string;
  onClose: () => void;
  onCreated: () => void;
}

const CreateLoanForm = ({ currentUserName, onClose, onCreated }: CreateLoanFormProps) => {
  const [lenderName, setLenderName] = useState(currentUserName);
  const [borrowerName, setBorrowerName] = useState('');
  const [lenderPassport, setLenderPassport] = useState('');
  const [borrowerPassport, setBorrowerPassport] = useState('');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [penaltyRate, setPenaltyRate] = useState('0.1');
  const [repaymentDate, setRepaymentDate] = useState('');
  const [city, setCity] = useState('Москва');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!lenderName.trim() || !borrowerName.trim() || !amount || !interestRate || !repaymentDate) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    const loan: Loan = {
      id: crypto.randomUUID(),
      lenderName: lenderName.trim(),
      borrowerName: borrowerName.trim(),
      lenderPassport: lenderPassport.trim(),
      borrowerPassport: borrowerPassport.trim(),
      amount: parseFloat(amount),
      interestRate: parseFloat(interestRate),
      penaltyRate: parseFloat(penaltyRate),
      repaymentDate,
      city: city.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
      status: 'active',
    };

    saveLoan(loan);
    generateLoanPDF(loan);
    toast.success('Договор создан и PDF скачан!');
    onCreated();
    onClose();
  };

  const inputClass = "h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card";

  return (
    <div className="fixed inset-0 bg-foreground/15 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto p-7">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display">Новый договор</h2>
              <p className="text-xs text-muted-foreground">Заполните данные займа</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lender" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Займодавец *</Label>
              <Input id="lender" value={lenderName} onChange={e => setLenderName(e.target.value)} placeholder="ФИО займодавца" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lenderPassport" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Паспорт</Label>
              <Input id="lenderPassport" value={lenderPassport} onChange={e => setLenderPassport(e.target.value)} placeholder="Серия и номер" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="borrower" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Заёмщик *</Label>
              <Input id="borrower" value={borrowerName} onChange={e => setBorrowerName(e.target.value)} placeholder="ФИО заёмщика" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="borrowerPassport" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Паспорт</Label>
              <Input id="borrowerPassport" value={borrowerPassport} onChange={e => setBorrowerPassport(e.target.value)} placeholder="Серия и номер" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Сумма (₽) *</Label>
              <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100 000" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ставка (%) *</Label>
              <Input id="rate" type="number" min="0" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="12" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="penalty" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Неустойка (%/день)</Label>
              <Input id="penalty" type="number" min="0" step="0.01" value={penaltyRate} onChange={e => setPenaltyRate(e.target.value)} placeholder="0.1" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Город</Label>
              <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Москва" className={inputClass} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата возврата *</Label>
            <Input id="date" type="date" value={repaymentDate} onChange={e => setRepaymentDate(e.target.value)} className={inputClass} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Примечания</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительные условия..." rows={3} className="rounded-xl bg-muted/50 border-border/50 focus:bg-card" />
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl gap-2 text-sm font-semibold">
            <FileText className="w-4 h-4" />
            Создать и скачать PDF
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateLoanForm;
