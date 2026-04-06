import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { BankDetailsManager } from '@/components/BankDetailsManager';
import { Save, Loader2, LogOut } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [passportSeries, setPassportSeries] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportIssuedBy, setPassportIssuedBy] = useState('');
  const [passportIssueDate, setPassportIssueDate] = useState('');
  const [passportDivisionCode, setPassportDivisionCode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
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
      setPassportIssuedBy(profile.passport_issued_by || '');
      setPassportIssueDate(profile.passport_issue_date || '');
      setPassportDivisionCode(profile.passport_division_code || '');
      setDateOfBirth(profile.date_of_birth || '');
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
          passport_issued_by: passportIssuedBy.trim(),
          passport_issue_date: passportIssueDate || null,
          passport_division_code: passportDivisionCode.trim(),
          date_of_birth: dateOfBirth || null,
          address: address.trim(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Профиль обновлён');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  const inputClass = "h-10 rounded-lg bg-secondary border-border/50 text-sm";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl font-bold font-display mb-6">Профиль и реквизиты</h1>

        {/* Personal info */}
        <section className="card-elevated p-5 mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Личные данные</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">ФИО</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Дата рождения</Label>
              <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Телефон</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={user.email || ''} disabled className={`${inputClass} opacity-50`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Серия паспорта</Label>
              <Input value={passportSeries} onChange={e => setPassportSeries(e.target.value)} placeholder="1234" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Номер паспорта</Label>
              <Input value={passportNumber} onChange={e => setPassportNumber(e.target.value)} placeholder="567890" className={inputClass} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Кем выдан</Label>
              <Input value={passportIssuedBy} onChange={e => setPassportIssuedBy(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Дата выдачи</Label>
              <Input type="date" value={passportIssueDate} onChange={e => setPassportIssueDate(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Код подразделения</Label>
              <Input value={passportDivisionCode} onChange={e => setPassportDivisionCode(e.target.value)} placeholder="123-456" className={inputClass} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Адрес регистрации</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="mt-4 gap-2 rounded-lg h-9 text-xs" size="sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Сохранить
          </Button>
        </section>

        {/* Bank details */}
        <section className="card-elevated p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Банковские реквизиты</h2>
          <BankDetailsManager />
        </section>

        {/* Logout */}
        <div className="pt-2 pb-4">
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl h-11 text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth');
            }}
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
