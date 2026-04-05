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

  const EDITABLE_STATUSES = new Set(['draft', 'awaiting_signatures', 'signed_by_lender', 'signed_by_borrower']);
  const canEdit = EDITABLE_STATUSES.has(loanStatus);
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
    const details = detailsRes.data || [];

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

    setMyDetails(details);
    setLoading(false);

    // Auto-preselect: if no allowed details for my role yet and exactly 1 bank detail exists, add it for each purpose
    if (canEdit && allowedData.filter(a => a.party_role === myRole).length === 0 && details.length === 1) {
      const detail = details[0];
      const purposes = ['disbursement', 'repayment'];
      for (const purpose of purposes) {
        await supabase.from('loan_allowed_bank_details').insert({
          loan_id: loanId,
          bank_detail_id: detail.id,
          party_role: myRole,
          purpose,
        });
      }
      toast.success('Единственный реквизит автоматически привязан к договору');
      fetchData(); // re-fetch to show updated state
      onUpdate?.();
    }
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
  const alreadyAddedForPurpose = new Set(
    myAllowed.filter(a => a.purpose === selectedPurpose).map(a => a.bank_detail_id)
  );
  const availableToAdd = myDetails.filter(d => !alreadyAddedForPurpose.has(d.id));

  // Check if there are details available for ANY purpose (to decide whether to show the add section)
  const hasAvailableForAnyPurpose = Object.keys(PURPOSE_LABELS).some(purpose => {
    const addedForPurpose = new Set(
      myAllowed.filter(a => a.purpose === purpose).map(a => a.bank_detail_id)
    );
    return myDetails.some(d => !addedForPurpose.has(d.id));
  });

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
                {canEdit && (
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
          <p className="text-sm text-muted-foreground">
            {myDetails.length === 0
              ? 'Добавьте реквизит в профиле, чтобы привязать его к договору'
              : 'Выберите реквизиты ниже'}
          </p>
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

      {/* Add details (before fully signed) */}
      {canEdit && hasAvailableForAnyPurpose && (
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
          {availableToAdd.length > 0 ? (
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
          ) : (
            <p className="text-xs text-muted-foreground">
              Все реквизиты уже добавлены для этого назначения. Переключите назначение выше.
            </p>
          )}
        </div>
      )}

      {canEdit && myDetails.length === 0 && (
        <div className="rounded-lg border border-dashed border-warning/30 bg-warning/5 p-3">
          <p className="text-xs text-warning font-medium">Нет реквизитов</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Добавьте банковские реквизиты в разделе «Профиль», чтобы привязать их к договору.</p>
        </div>
      )}
    </div>
  );
};
