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
  UNEP_AGREEMENT: 'unep_agreement',
  EDO_REGULATION: 'edo_regulation',
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

/** Scope of a document type */
export type DocumentScope = 'loan' | 'platform';

export interface DocumentTypeConfig {
  readonly type: DocumentType;
  readonly label: string;
  readonly description: string;
  /** Whether this document requires a source_entity_id (e.g. tranche_id, repayment_id) */
  readonly requiresSourceEntity: boolean;
  /** Whether template text is ready or placeholder */
  readonly templateStatus: 'ready' | 'placeholder';
  /** 'loan' = per-deal personalized, 'platform' = common non-personalized */
  readonly scope: DocumentScope;
}

export const DOCUMENT_TYPE_CONFIGS: Record<DocumentType, DocumentTypeConfig> = {
  [DOCUMENT_TYPES.LOAN_CONTRACT]: {
    type: DOCUMENT_TYPES.LOAN_CONTRACT,
    label: 'Договор займа',
    description: 'Основной договор между займодавцем и заёмщиком',
    requiresSourceEntity: false,
    templateStatus: 'ready',
    scope: 'loan',
  },
  [DOCUMENT_TYPES.TRANCHE_RECEIPT]: {
    type: DOCUMENT_TYPES.TRANCHE_RECEIPT,
    label: 'Расписка о получении средств',
    description: 'Расписка, подтверждающая получение транша заёмщиком',
    requiresSourceEntity: true,
    templateStatus: 'ready',
    scope: 'loan',
  },
  [DOCUMENT_TYPES.APPENDIX_BANK_DETAILS]: {
    type: DOCUMENT_TYPES.APPENDIX_BANK_DETAILS,
    label: 'Приложение 1: Банковские реквизиты',
    description: 'Допустимые банковские реквизиты для выдачи и погашения',
    requiresSourceEntity: false,
    templateStatus: 'ready',
    scope: 'loan',
  },
  [DOCUMENT_TYPES.APPENDIX_REPAYMENT_SCHEDULE]: {
    type: DOCUMENT_TYPES.APPENDIX_REPAYMENT_SCHEDULE,
    label: 'Приложение 2: График погашения',
    description: 'График погашения займа',
    requiresSourceEntity: false,
    templateStatus: 'ready',
    scope: 'loan',
  },
  [DOCUMENT_TYPES.PARTIAL_REPAYMENT_CONFIRMATION]: {
    type: DOCUMENT_TYPES.PARTIAL_REPAYMENT_CONFIRMATION,
    label: 'Подтверждение частичного погашения',
    description: 'Подтверждение получения частичного платежа по займу',
    requiresSourceEntity: true,
    templateStatus: 'ready',
    scope: 'loan',
  },
  [DOCUMENT_TYPES.FULL_REPAYMENT_CONFIRMATION]: {
    type: DOCUMENT_TYPES.FULL_REPAYMENT_CONFIRMATION,
    label: 'Подтверждение полного погашения',
    description: 'Подтверждение полного исполнения обязательств по договору',
    requiresSourceEntity: false,
    templateStatus: 'ready',
    scope: 'loan',
  },
  [DOCUMENT_TYPES.UNEP_AGREEMENT]: {
    type: DOCUMENT_TYPES.UNEP_AGREEMENT,
    label: 'Приложение 6: Соглашение о признании УНЭП',
    description: 'Двустороннее соглашение о взаимном признании действительности УНЭП',
    requiresSourceEntity: false,
    templateStatus: 'ready',
    scope: 'loan',
  },
  [DOCUMENT_TYPES.EDO_REGULATION]: {
    type: DOCUMENT_TYPES.EDO_REGULATION,
    label: 'Регламент электронного взаимодействия',
    description: 'Общеплатформенный регламент ЭДО — внешний, версионный, не персонализированный',
    requiresSourceEntity: false,
    templateStatus: 'ready',
    scope: 'platform',
  },
};
