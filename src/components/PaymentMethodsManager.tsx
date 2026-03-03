import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, Smartphone, Plus, Trash2, Star, StarOff, Loader2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  user_id: string;
  method_type: 'sbp' | 'card';
  label: string;
  phone: string | null;
  card_number: string | null;
  card_holder: string | null;
  bank_name: string | null;
  is_default: boolean;
}

const PaymentMethodsManager = () => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'sbp' | 'card' | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [label, setLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    if (user) fetchMethods();
  }, [user]);

  const fetchMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setMethods((data as any[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setLabel('');
    setPhone('');
    setCardNumber('');
    setCardHolder('');
    setBankName('');
    setShowForm(null);
  };

  const handleSave = async () => {
    if (!user) return;

    if (showForm === 'sbp' && !phone.trim()) {
      toast.error('Укажите номер телефона');
      return;
    }
    if (showForm === 'card' && !cardNumber.trim()) {
      toast.error('Укажите номер карты');
      return;
    }

    setSaving(true);
    try {
      const isFirst = methods.length === 0;
      const { error } = await supabase.from('payment_methods').insert({
        user_id: user.id,
        method_type: showForm!,
        label: label.trim() || (showForm === 'sbp' ? 'СБП' : 'Карта'),
        phone: showForm === 'sbp' ? phone.trim() : null,
        card_number: showForm === 'card' ? cardNumber.trim() : null,
        card_holder: showForm === 'card' ? cardHolder.trim() : null,
        bank_name: bankName.trim() || null,
        is_default: isFirst,
      } as any);
      if (error) throw error;

      toast.success('Реквизиты добавлены');
      resetForm();
      fetchMethods();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
      return;
    }
    toast.success('Реквизиты удалены');
    fetchMethods();
  };

  const handleSetDefault = async (id: string) => {
    // Unset all defaults first
    await supabase
      .from('payment_methods')
      .update({ is_default: false } as any)
      .eq('user_id', user!.id);
    // Set new default
    await supabase
      .from('payment_methods')
      .update({ is_default: true } as any)
      .eq('id', id);
    fetchMethods();
    toast.success('Основной способ оплаты обновлён');
  };

  const inputClass = "h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card";

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка...</p>;

  return (
    <div className="space-y-6">
      {/* Existing methods */}
      {methods.length > 0 && (
        <div className="space-y-3">
          {methods.map(m => (
            <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/40">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-card">
                {m.method_type === 'sbp' ? (
                  <Smartphone className="w-5 h-5 text-accent" />
                ) : (
                  <CreditCard className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{m.label}</p>
                  {m.is_default && (
                    <span className="pill-badge bg-accent/10 text-accent text-[10px]">Основной</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.method_type === 'sbp' ? m.phone : `•••• ${m.card_number?.slice(-4) || ''}`}
                  {m.bank_name && ` • ${m.bank_name}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!m.is_default && (
                  <button
                    onClick={() => handleSetDefault(m.id)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Сделать основным"
                  >
                    <StarOff className="w-4 h-4" />
                  </button>
                )}
                {m.is_default && (
                  <div className="p-2 text-accent">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                )}
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add buttons */}
      {!showForm && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 rounded-xl h-11"
            onClick={() => setShowForm('sbp')}
          >
            <Smartphone className="w-4 h-4" />
            Добавить СБП
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 rounded-xl h-11"
            onClick={() => setShowForm('card')}
          >
            <CreditCard className="w-4 h-4" />
            Добавить карту
          </Button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-5 rounded-xl border border-border/40 bg-card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            {showForm === 'sbp' ? (
              <Smartphone className="w-5 h-5 text-accent" />
            ) : (
              <CreditCard className="w-5 h-5 text-primary" />
            )}
            <h4 className="font-semibold text-sm font-display">
              {showForm === 'sbp' ? 'Новый СБП реквизит' : 'Новая банковская карта'}
            </h4>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Название</Label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={showForm === 'sbp' ? 'Например: Сбер СБП' : 'Например: Тинькофф'}
              className={inputClass}
            />
          </div>

          {showForm === 'sbp' ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Номер телефона *</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                className={inputClass}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Номер карты *</Label>
                <Input
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Держатель карты</Label>
                <Input
                  value={cardHolder}
                  onChange={e => setCardHolder(e.target.value)}
                  placeholder="IVAN IVANOV"
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Банк</Label>
            <Input
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="Сбербанк, Тинькофф и т.д."
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={resetForm} variant="outline" className="flex-1 rounded-xl h-11">
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl h-11 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Сохранить
            </Button>
          </div>
        </div>
      )}

      {methods.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Привяжите реквизиты, чтобы займодавцы могли отправлять вам деньги
        </p>
      )}
    </div>
  );
};

export default PaymentMethodsManager;
