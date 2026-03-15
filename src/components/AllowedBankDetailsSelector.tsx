import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, Plus, X, Loader2, CreditCard } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type BankDetail = Tables<'bank_details'>;
type AllowedDetail = Tables<'loan_allowed_bank_details'>;

interface AllowedBankDetailsSelectorProps {
  loanId: string;
  lenderId: string;
  borrowerId: string | null;
  loanStatus: string;
  onUpdate?: () => void;
}

interface DetailWithBank extends AllowedDetail {
  bank_detail?: BankDetail;
}

const PURPOSE_LABELS: Record<string, string> = {
  disbursement: 'Выдача (перечисление)',
  repayment: 'Погашение (возврат)',
};

const ROLE_LABELS: Record<string, string> = {
  lender: 'Займодавец',
  borrower: 'Заёмщик',
};

export const AllowedBankDetailsSelector = ({
  loanId,
  lenderId,
  borrowerId,
  loanStatus,
  onUpdate,
}: AllowedBankDetailsSelectorProps) => {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<DetailWithBank[]>([]);
  const [myDetails, setMyDetails] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState<string>('disbursement');

  const isDraft = loanStatus === 'draft';
  const isParty = user?.id === lenderId || user?.id === borrowerId;
  const myRole = user?.id === lenderId ? 'lender' : 'borrower';

  useEffect(() => {
    if (isParty) fetchData();
  }, [loanId, user?.id]);

  const fetchData = async () => {
    const [allowedRes, detailsRes] = await Promise.all([
      supabase
        .from('loan_allowed_bank_details')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: true }),
      supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false }),
    ]);

    const allowedData = allowedRes.data || [];

    // Fetch bank detail info for each allowed entry
    if (allowedData.length > 0) {
      const bankIds = [...new Set(allowedData.map(a => a.bank_detail_id))];
      const { data: bankData } = await supabase
        .from('bank_details')
        .select('*')
        .in('id', bankIds);

      const bankMap = new Map((bankData || []).map(b => [b.id, b]));
      const enriched = allowedData.map(a => ({
        ...a,
        bank_detail: bankMap.get(a.bank_detail_id),
      }));
      setAllowed(enriched);
    } else {
      setAllowed([]);
    }

    setMyDetails(detailsRes.data || []);
    setLoading(false);
  };

  const handleAdd = async (bankDetailId: string) => {
    setAdding(true);
    const { error } = await supabase.from('loan_allowed_bank_details').insert({
      loan_id: loanId,
      bank_detail_id: bankDetailId,
      party_role: myRole,
      purpose: selectedPurpose,
    });
    if (error) {
      toast.error('Ошибка добавления реквизитов');
    } else {
      toast.success('Реквизиты добавлены к договору');
      fetchData();
      onUpdate?.();
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase
      .from('loan_allowed_bank_details')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Реквизиты убраны');
      fetchData();
      onUpdate?.();
    }
  };

  if (!isParty) return null;
  if (loading) return <p className="text-sm text-muted-foreground">Загрузка реквизитов...</p>;

  const myAllowed = allowed.filter(a => a.party_role === myRole);
  const counterpartyAllowed = allowed.filter(a => a.party_role !== myRole);
  const alreadyAddedIds = new Set(myAllowed.map(a => a.bank_detail_id));
  const availableToAdd = myDetails.filter(d => !alreadyAddedIds.has(d.id));

  return (
    <div className="space-y-6">
      {/* My allowed details */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Мои реквизиты в договоре ({ROLE_LABELS[myRole]})
        </h4>
        {myAllowed.length > 0 ? (
          <div className="space-y-2">
            {myAllowed.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/40">
                <Check className="w-4 h-4 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {a.bank_detail?.bank_name || 'Реквизит'}
                    {a.bank_detail?.card_number && ` • *${a.bank_detail.card_number.slice(-4)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{PURPOSE_LABELS[a.purpose] || a.purpose}</p>
                </div>
                {isDraft && (
                  <button
                    onClick={() => handleRemove(a.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Реквизиты не выбраны</p>
        )}
      </div>

      {/* Counterparty details (read-only) */}
      {counterpartyAllowed.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Реквизиты контрагента ({ROLE_LABELS[myRole === 'lender' ? 'borrower' : 'lender']})
          </h4>
          <div className="space-y-2">
            {counterpartyAllowed.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {a.bank_detail?.bank_name || 'Реквизит'}
                    {a.bank_detail?.card_number && ` • *${a.bank_detail.card_number.slice(-4)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{PURPOSE_LABELS[a.purpose] || a.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add details (only in draft) */}
      {isDraft && availableToAdd.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Добавить реквизиты
          </h4>
          <div className="flex gap-2 mb-3">
            {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSelectedPurpose(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedPurpose === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {availableToAdd.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/50 hover:border-primary/30 transition-colors">
                <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.bank_name}{d.card_number && ` • *${d.card_number.slice(-4)}`}</p>
                  {d.recipient_display_name && <p className="text-xs text-muted-foreground">{d.recipient_display_name}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-8 gap-1 text-xs"
                  disabled={adding}
                  onClick={() => handleAdd(d.id)}
                >
                  {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Добавить
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDraft && myDetails.length === 0 && (
        <p className="text-xs text-muted-foreground">
          У вас нет банковских реквизитов. Добавьте их в профиле.
        </p>
      )}
    </div>
  );
};
