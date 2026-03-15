import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Star, StarOff, Loader2, Link2, Image, X, Eye } from 'lucide-react';

interface BankDetail {
  id: string;
  user_id: string;
  label: string;
  bank_name: string;
  detail_type: string;
  transfer_link: string | null;
  qr_image_url: string | null;
  recipient_display_name: string | null;
  card_number: string | null;
  phone: string | null;
  account_number: string | null;
  bik: string | null;
  is_default: boolean;
}

const BANK_PRESETS = [
  { id: 'tbank', label: 'Т-Банк' },
  { id: 'sber', label: 'Сбер' },
  { id: 'other', label: 'Другой банк' },
];

function detectBank(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('tinkoff') || hostname.includes('t-bank')) return 'Т-Банк';
    if (hostname.includes('sber')) return 'Сбер';
  } catch { /* invalid URL */ }
  return null;
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export const BankDetailsManager = () => {
  const { user } = useAuth();
  const [details, setDetails] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewQr, setPreviewQr] = useState<string | null>(null);

  const [selectedBank, setSelectedBank] = useState('tbank');
  const [transferLink, setTransferLink] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) fetchDetails();
  }, [user]);

  const fetchDetails = async () => {
    const { data } = await supabase
      .from('bank_details')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setDetails((data as BankDetail[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setSelectedBank('tbank');
    setTransferLink('');
    setRecipientName('');
    setCardNumber('');
    setPhone('');
    setQrFile(null);
    setQrPreviewUrl(null);
    setShowForm(false);
  };

  const handleQrFileChange = (file: File | null) => {
    if (!file) {
      setQrFile(null);
      setQrPreviewUrl(null);
      return;
    }
    setQrFile(file);
    setQrPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;

    const hasLink = transferLink.trim().length > 0;
    const hasQr = !!qrFile;
    const hasCard = cardNumber.trim().length > 0;

    if (!hasLink && !hasQr && !hasCard) {
      toast.error('Укажите ссылку, номер карты или загрузите QR-код');
      return;
    }

    if (hasLink && !isValidUrl(transferLink.trim())) {
      toast.error('Введите корректную ссылку (URL)');
      return;
    }

    setSaving(true);
    try {
      let qrImageUrl: string | null = null;

      if (qrFile) {
        setUploading(true);
        const ext = qrFile.name.split('.').pop();
        const path = `qr/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-screenshots')
          .upload(path, qrFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('payment-screenshots')
          .getPublicUrl(path);
        qrImageUrl = urlData.publicUrl;
        setUploading(false);
      }

      const bankPreset = BANK_PRESETS.find(b => b.id === selectedBank);
      const detectedBank = hasLink ? detectBank(transferLink.trim()) : null;
      const bankName = detectedBank || bankPreset?.label || 'Другой банк';
      const isFirst = details.length === 0;

      const { error } = await supabase.from('bank_details').insert({
        user_id: user.id,
        label: bankName,
        bank_name: bankName,
        detail_type: 'general',
        transfer_link: hasLink ? transferLink.trim() : null,
        qr_image_url: qrImageUrl,
        recipient_display_name: recipientName.trim() || null,
        card_number: hasCard ? cardNumber.trim() : null,
        phone: phone.trim() || null,
        is_default: isFirst,
      });
      if (error) throw error;

      toast.success('Реквизиты добавлены');
      resetForm();
      fetchDetails();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения';
      toast.error(message);
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('bank_details').delete().eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
      return;
    }
    toast.success('Реквизиты удалены');
    fetchDetails();
  };

  const handleSetDefault = async (id: string) => {
    await supabase
      .from('bank_details')
      .update({ is_default: false })
      .eq('user_id', user!.id);
    await supabase
      .from('bank_details')
      .update({ is_default: true })
      .eq('id', id);
    fetchDetails();
    toast.success('Основные реквизиты обновлены');
  };

  const inputClass = "h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card";

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка...</p>;

  return (
    <div className="space-y-6">
      {details.length > 0 && (
        <div className="space-y-3">
          {details.map(m => (
            <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/40">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-card">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{m.bank_name || m.label}</p>
                  {m.is_default && (
                    <span className="pill-badge bg-accent/10 text-accent text-[10px]">Основной</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {m.recipient_display_name && `${m.recipient_display_name} • `}
                  {m.card_number && `*${m.card_number.slice(-4)} • `}
                  {m.transfer_link ? 'Ссылка' : ''}
                  {m.transfer_link && m.qr_image_url ? ' + ' : ''}
                  {m.qr_image_url ? 'QR' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {m.qr_image_url && (
                  <button onClick={() => setPreviewQr(m.qr_image_url)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Показать QR">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {!m.is_default && (
                  <button onClick={() => handleSetDefault(m.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Сделать основным">
                    <StarOff className="w-4 h-4" />
                  </button>
                )}
                {m.is_default && (
                  <div className="p-2 text-accent">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                )}
                <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Удалить">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm && (
        <Button variant="outline" className="w-full gap-2 rounded-xl h-11" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Добавить реквизиты
        </Button>
      )}

      {showForm && (
        <div className="p-5 rounded-xl border border-border/40 bg-card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-sm font-display">Новые банковские реквизиты</h4>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Банк</Label>
            <div className="flex gap-2">
              {BANK_PRESETS.map(bank => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedBank === bank.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {bank.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Номер карты</Label>
            <Input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000" className={inputClass} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Телефон (СБП)</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" className={inputClass} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ссылка на перевод</Label>
            <Input value={transferLink} onChange={e => setTransferLink(e.target.value)} placeholder="Ссылка из банковского приложения" className={inputClass} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QR-код</Label>
            {qrPreviewUrl ? (
              <div className="relative inline-block">
                <img src={qrPreviewUrl} alt="QR" className="w-32 h-32 object-contain rounded-xl border border-border/40" />
                <div className="flex gap-2 mt-2">
                  <label className="text-xs text-primary cursor-pointer hover:underline">
                    Заменить
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleQrFileChange(e.target.files?.[0] || null)} />
                  </label>
                  <button onClick={() => handleQrFileChange(null)} className="text-xs text-destructive hover:underline">Удалить</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input type="file" accept="image/*" onChange={e => handleQrFileChange(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className={`${inputClass} flex items-center gap-2 px-3 border rounded-xl cursor-pointer`}>
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Загрузить изображение QR</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Имя получателя</Label>
            <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Иван Иванов" className={inputClass} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={resetForm} variant="outline" className="flex-1 rounded-xl h-11">Отмена</Button>
            <Button onClick={handleSave} disabled={saving || uploading} className="flex-1 rounded-xl h-11 gap-2">
              {(saving || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Сохранить
            </Button>
          </div>
        </div>
      )}

      {details.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Добавьте банковские реквизиты для выдачи и получения переводов
        </p>
      )}

      {previewQr && (
        <div className="fixed inset-0 bg-foreground/15 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setPreviewQr(null)}>
          <div className="card-elevated p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm font-display">QR-код</h4>
              <button onClick={() => setPreviewQr(null)} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewQr} alt="QR-код" className="w-full max-w-[280px] mx-auto rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
