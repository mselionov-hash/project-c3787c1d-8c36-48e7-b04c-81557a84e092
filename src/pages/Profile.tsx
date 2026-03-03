import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PaymentMethodsManager from '@/components/PaymentMethodsManager';
import {
  ArrowLeft, User, CreditCard, Save, Loader2
} from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [passportSeries, setPassportSeries] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setPassportSeries(profile.passport_series || '');
      setPassportNumber(profile.passport_number || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          passport_series: passportSeries.trim(),
          passport_number: passportNumber.trim(),
          address: address.trim(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Профиль обновлён');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  const inputClass = "h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold font-display">Мой профиль</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Personal info */}
        <div className="card-elevated p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Личные данные</h3>
              <p className="text-xs text-muted-foreground">Основная информация</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ФИО</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Телефон</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input value={user.email || ''} disabled className={`${inputClass} opacity-60`} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Серия паспорта</Label>
              <Input value={passportSeries} onChange={e => setPassportSeries(e.target.value)} placeholder="1234" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Номер паспорта</Label>
              <Input value={passportNumber} onChange={e => setPassportNumber(e.target.value)} placeholder="567890" className={inputClass} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Адрес</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="mt-6 gap-2 rounded-xl h-11 w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить
          </Button>
        </div>

        {/* Payment methods */}
        <div className="card-elevated p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">Реквизиты для получения</h3>
              <p className="text-xs text-muted-foreground">Карты и СБП для приёма переводов</p>
            </div>
          </div>

          <PaymentMethodsManager />
        </div>
      </main>
    </div>
  );
};

export default Profile;
