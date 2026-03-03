import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Smartphone, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

interface Props {
  borrowerId: string;
  loanAmount: number;
  loanNumber: string;
  onSelectMethod: (method: PaymentMethod) => void;
}

const BorrowerPaymentMethodPicker = ({ borrowerId, loanAmount, loanNumber, onSelectMethod }: Props) => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', borrowerId)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        const m = (data as any[]) || [];
        setMethods(m);
        const def = m.find(x => x.is_default);
        if (def) {
          setSelected(def.id);
          onSelectMethod(def);
        }
        setLoading(false);
      });
  }, [borrowerId]);

  const handleSelect = (m: PaymentMethod) => {
    setSelected(m.id);
    onSelectMethod(m);
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} скопировано`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Загрузка реквизитов...</p>;

  if (methods.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-sm">
        <p className="font-semibold text-warning">Заёмщик не привязал реквизиты</p>
        <p className="text-muted-foreground text-xs mt-1">Попросите заёмщика добавить реквизиты в своём профиле</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Реквизиты заёмщика</p>
      {methods.map(m => {
        const isSelected = selected === m.id;
        const detail = m.method_type === 'sbp' ? m.phone : `•••• ${m.card_number?.slice(-4) || ''}`;
        const fullDetail = m.method_type === 'sbp' ? m.phone || '' : m.card_number || '';

        return (
          <div
            key={m.id}
            onClick={() => handleSelect(m)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              isSelected
                ? 'border-accent bg-accent/5'
                : 'border-border/40 hover:border-border'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              m.method_type === 'sbp' ? 'bg-accent/10' : 'bg-primary/10'
            }`}>
              {m.method_type === 'sbp' ? (
                <Smartphone className="w-5 h-5 text-accent" />
              ) : (
                <CreditCard className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{m.label}</p>
              <p className="text-xs text-muted-foreground">
                {detail} {m.bank_name && `• ${m.bank_name}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={e => { e.stopPropagation(); handleCopy(fullDetail, m.label); }}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {copied === m.label ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              </button>
              {isSelected && <CheckCircle2 className="w-5 h-5 text-accent" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BorrowerPaymentMethodPicker;
