import { Image, FileText, Banknote, CreditCard } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Tranche = Tables<'loan_tranches'>;
type Payment = Tables<'loan_payments'>;

interface TransferEvidenceProps {
  tranches: Tranche[];
  payments: Payment[];
}

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

const ProofThumbnail = ({ url }: { url: string }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" className="block">
    {isImage(url) ? (
      <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-border/40 hover:border-primary/50 transition-colors" />
    ) : (
      <div className="w-14 h-14 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center hover:border-primary/50 transition-colors">
        <FileText className="w-5 h-5 text-muted-foreground" />
      </div>
    )}
  </a>
);

export const TransferEvidence = ({ tranches, payments }: TransferEvidenceProps) => {
  // Collect tranche screenshots from sender/receiver display (we use screenshot_url field from payments)
  const tranchesWithProof = tranches.filter(t => t.transfer_source);
  const paymentsWithProof = payments.filter(p => p.screenshot_url);

  if (tranchesWithProof.length === 0 && paymentsWithProof.length === 0) {
    return null;
  }

  return (
    <div className="card-elevated p-5">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <Image className="w-3.5 h-3.5" />
        Подтверждения переводов
      </h2>

      {tranchesWithProof.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Banknote className="w-3 h-3" /> Транши
          </p>
          <div className="space-y-2">
            {tranchesWithProof.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Транш № {t.tranche_number} — {Number(t.amount).toLocaleString('ru-RU')} ₽</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.actual_date ? new Date(t.actual_date).toLocaleDateString('ru-RU') : new Date(t.planned_date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {t.transfer_source?.split(',').map((url, i) => (
                    <ProofThumbnail key={i} url={url.trim()} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {paymentsWithProof.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CreditCard className="w-3 h-3" /> Погашения
          </p>
          <div className="space-y-2">
            {paymentsWithProof.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{Number(p.transfer_amount).toLocaleString('ru-RU')} ₽</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(p.transfer_date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {p.screenshot_url?.split(',').map((url, i) => (
                    <ProofThumbnail key={i} url={url.trim()} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
