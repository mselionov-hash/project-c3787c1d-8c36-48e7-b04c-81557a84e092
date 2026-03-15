/**
 * Document type definitions for the legal loan platform.
 * Each document type corresponds to a distinct legal document
 * that can be generated from loan data.
 */

export const DOCUMENT_TYPES = {
  LOAN_CONTRACT: 'loan_contract',
  TRANCHE_RECEIPT: 'tranche_receipt',
  APPENDIX_BANK_DETAILS: 'appendix_bank_details',
  APPENDIX_REPAYMENT_SCHEDULE: 'appendix_repayment_schedule',
  PARTIAL_REPAYMENT_CONFIRMATION: 'partial_repayment_confirmation',
  FULL_REPAYMENT_CONFIRMATION: 'full_repayment_confirmation',
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

export interface DocumentTypeConfig {
  readonly type: DocumentType;
  readonly label: string;
  readonly description: string;
  /** Whether this document requires a source_entity_id (e.g. tranche_id, repayment_id) */
  readonly requiresSourceEntity: boolean;
}

export const DOCUMENT_TYPE_CONFIGS: Record<DocumentType, DocumentTypeConfig> = {
  [DOCUMENT_TYPES.LOAN_CONTRACT]: {
    type: DOCUMENT_TYPES.LOAN_CONTRACT,
    label: 'Договор займа',
    description: 'Основной договор между займодавцем и заёмщиком',
    requiresSourceEntity: false,
  },
  [DOCUMENT_TYPES.TRANCHE_RECEIPT]: {
    type: DOCUMENT_TYPES.TRANCHE_RECEIPT,
    label: 'Расписка о получении средств',
    description: 'Расписка, подтверждающая получение транша заёмщиком',
    requiresSourceEntity: true,
  },
  [DOCUMENT_TYPES.APPENDIX_BANK_DETAILS]: {
    type: DOCUMENT_TYPES.APPENDIX_BANK_DETAILS,
    label: 'Приложение 1: Банковские реквизиты',
    description: 'Допустимые банковские реквизиты для выдачи и погашения',
    requiresSourceEntity: false,
  },
  [DOCUMENT_TYPES.APPENDIX_REPAYMENT_SCHEDULE]: {
    type: DOCUMENT_TYPES.APPENDIX_REPAYMENT_SCHEDULE,
    label: 'Приложение 2: График погашения',
    description: 'График погашения займа',
    requiresSourceEntity: false,
  },
  [DOCUMENT_TYPES.PARTIAL_REPAYMENT_CONFIRMATION]: {
    type: DOCUMENT_TYPES.PARTIAL_REPAYMENT_CONFIRMATION,
    label: 'Подтверждение частичного погашения',
    description: 'Подтверждение получения частичного платежа по займу',
    requiresSourceEntity: true,
  },
  [DOCUMENT_TYPES.FULL_REPAYMENT_CONFIRMATION]: {
    type: DOCUMENT_TYPES.FULL_REPAYMENT_CONFIRMATION,
    label: 'Подтверждение полного погашения',
    description: 'Подтверждение полного исполнения обязательств по договору',
    requiresSourceEntity: false,
  },
};
