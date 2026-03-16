import { FileCheck, Download, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

type GeneratedDocument = Tables<'generated_documents'>;

interface DocumentsListProps {
  documents: GeneratedDocument[];
  isFullySigned: boolean;
  isLender: boolean;
  loanStatus: string;
  hasSchedule: boolean;
  hasScheduleItems: boolean;
  onGenerateContract?: () => void;
  onGenerateAppendix1?: () => void;
  onGenerateAppendix2?: () => void;
  onGenerateFullConfirmation?: () => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  loan_contract: 'Договор займа',
  tranche_receipt: 'Расписка о получении транша',
  appendix_bank_details: 'Приложение 1: Банковские реквизиты',
  appendix_repayment_schedule: 'Приложение 2: График погашения',
  partial_repayment_confirmation: 'Подтверждение частичного погашения',
  full_repayment_confirmation: 'Подтверждение полного погашения',
};

export const DocumentsList = ({
  documents,
  isFullySigned,
  isLender,
  loanStatus,
  hasSchedule,
  hasScheduleItems,
  onGenerateContract,
  onGenerateAppendix1,
  onGenerateAppendix2,
  onGenerateFullConfirmation,
}: DocumentsListProps) => {
  const canGenerateAppendix2 = hasSchedule && hasScheduleItems;
  const canGenerateFullConfirmation = isLender && loanStatus === 'repaid';

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

      {/* Generation actions */}
      {isFullySigned && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={onGenerateContract}>
            <FileText className="w-3.5 h-3.5" />
            Договор
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={onGenerateAppendix1}>
            <FileText className="w-3.5 h-3.5" />
            Прил. 1
          </Button>
          {canGenerateAppendix2 && (
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={onGenerateAppendix2}>
              <FileText className="w-3.5 h-3.5" />
              Прил. 2
            </Button>
          )}
          {canGenerateFullConfirmation && (
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={onGenerateFullConfirmation}>
              <FileText className="w-3.5 h-3.5" />
              Полное погашение
            </Button>
          )}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Документы ещё не сформированы. Используйте кнопки выше для генерации.
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
                  v{doc.template_version} • {new Date(doc.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {doc.source_entity_id && ` • ID: ${doc.source_entity_id.slice(0, 8)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
