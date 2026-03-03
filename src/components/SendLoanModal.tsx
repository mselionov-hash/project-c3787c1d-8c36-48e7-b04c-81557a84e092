import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, X, Loader2, UserCheck, Search } from 'lucide-react';

interface SendLoanModalProps {
  loanId: string;
  borrowerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SendLoanModal = ({ loanId, borrowerName, onClose, onSuccess }: SendLoanModalProps) => {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [foundUser, setFoundUser] = useState<{ user_id: string; full_name: string } | null>(null);

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error('Введите email');
      return;
    }
    setSearching(true);
    setFoundUser(null);

    try {
      const { data, error } = await supabase.rpc('find_user_by_email', {
        lookup_email: email.trim(),
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setFoundUser(data[0]);
      } else {
        toast.error('Пользователь с таким email не найден в системе');
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка поиска');
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!foundUser) return;
    setSending(true);

    try {
      const { error } = await supabase
        .from('loans')
        .update({ borrower_id: foundUser.user_id })
        .eq('id', loanId);

      if (error) throw error;

      toast.success(`Договор отправлен пользователю ${foundUser.full_name}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const inputClass = "h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-card";

  return (
    <div className="fixed inset-0 bg-foreground/15 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-elevated w-full max-w-md p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">Отправить договор</h3>
              <p className="text-xs text-muted-foreground">Заёмщик: {borrowerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email заёмщика в системе
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setFoundUser(null); }}
                placeholder="borrower@example.com"
                className={inputClass + ' flex-1'}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch} disabled={searching} className="rounded-xl px-4">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {foundUser && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">{foundUser.full_name}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={!foundUser || sending}
            className="w-full h-12 rounded-xl gap-2 text-sm font-semibold"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Отправить договор заёмщику
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            После отправки заёмщик увидит договор в своём личном кабинете и сможет его подписать
          </p>
        </div>
      </div>
    </div>
  );
};

export default SendLoanModal;
