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
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [repaymentDate, setRepaymentDate] = useState('');
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
      amount: parseFloat(amount),
      interestRate: parseFloat(interestRate),
      repaymentDate,
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

  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-glass w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold">Новый договор займа</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lender">Займодавец *</Label>
              <Input
                id="lender"
                value={lenderName}
                onChange={e => setLenderName(e.target.value)}
                placeholder="ФИО займодавца"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="borrower">Заёмщик *</Label>
              <Input
                id="borrower"
                value={borrowerName}
                onChange={e => setBorrowerName(e.target.value)}
                placeholder="ФИО заёмщика"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма (₽) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="100 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Процентная ставка (%) *</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.1"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
                placeholder="12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Дата возврата *</Label>
            <Input
              id="date"
              type="date"
              value={repaymentDate}
              onChange={e => setRepaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Дополнительные условия..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full gap-2">
            <FileText className="w-4 h-4" />
            Создать и скачать PDF
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateLoanForm;
