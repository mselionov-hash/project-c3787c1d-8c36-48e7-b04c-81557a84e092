import { FileCheck } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type GeneratedDocument = Tables<'generated_documents'>;

interface DocumentsListProps {
  documents: GeneratedDocument[];
}

const DOC_TYPE_LABELS: Record<string, string> = {
  loan_contract: 'Договор займа',
  tranche_receipt: 'Расписка о получении транша',
  appendix_bank_details: 'Приложение 1: Банковские реквизиты',
  appendix_repayment_schedule: 'Приложение 2: График погашения',
  partial_repayment_confirmation: 'Подтверждение частичного погашения',
  full_repayment_confirmation: 'Подтверждение полного погашения',
};

export const DocumentsList = ({ documents }: DocumentsListProps) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Документы</h3>
          <p className="text-xs text-muted-foreground">Сформированные документы по договору</p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Документы будут сформированы автоматически (Phase 4)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/40">
              <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  v{doc.template_version} • {new Date(doc.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
