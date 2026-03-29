import { useNavigate } from 'react-router-dom';
import { FileCheck, FileText, ExternalLink } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type GeneratedDocument = Tables<'generated_documents'>;

interface DocStatusBadgesProps {
  documents: GeneratedDocument[];
  loanId: string;
}

const DOC_SHORT: Record<string, string> = {
  loan_contract: 'Договор',
  tranche_receipt: 'Расписка',
  appendix_bank_details: 'Прил. 1',
  appendix_repayment_schedule: 'Прил. 2',
  partial_repayment_confirmation: 'Частичное погашение',
  full_repayment_confirmation: 'Полное погашение',
};

export const DocStatusBadges = ({ documents, loanId }: DocStatusBadgesProps) => {
  const navigate = useNavigate();

  if (documents.length === 0) return null;

  // Deduplicate by type — show latest of each
  const byType = new Map<string, GeneratedDocument>();
  documents.forEach(d => {
    if (!byType.has(d.document_type)) byType.set(d.document_type, d);
  });

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          Документы
        </h2>
        <button
          onClick={() => navigate('/documents')}
          className="text-[10px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Все документы <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from(byType.entries()).map(([type, doc]) => (
          <span
            key={type}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/8 text-primary text-[10px] font-medium"
          >
            <FileCheck className="w-3 h-3" />
            {DOC_SHORT[type] || type}
          </span>
        ))}
      </div>
    </div>
  );
};
