/**
 * Document registry: maps document_type → template + metadata.
 * Template engine and renderer will be implemented in Phase 4.
 */

import { type DocumentType, DOCUMENT_TYPE_CONFIGS } from '@/legal/document-types';
import { LOAN_CONTRACT_TEMPLATE, LOAN_CONTRACT_TEMPLATE_VERSION, LOAN_CONTRACT_VARIABLES } from '@/legal/templates/loan-contract';
import { TRANCHE_RECEIPT_TEMPLATE, TRANCHE_RECEIPT_TEMPLATE_VERSION, TRANCHE_RECEIPT_VARIABLES } from '@/legal/templates/tranche-receipt';
import { APPENDIX_BANK_DETAILS_TEMPLATE, APPENDIX_BANK_DETAILS_TEMPLATE_VERSION, APPENDIX_BANK_DETAILS_VARIABLES } from '@/legal/templates/appendix-bank-details';
import { APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE, APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE_VERSION, APPENDIX_REPAYMENT_SCHEDULE_VARIABLES } from '@/legal/templates/appendix-repayment-schedule';
import { PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE, PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION, PARTIAL_REPAYMENT_CONFIRMATION_VARIABLES } from '@/legal/templates/partial-repayment-confirmation';
import { FULL_REPAYMENT_CONFIRMATION_TEMPLATE, FULL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION, FULL_REPAYMENT_CONFIRMATION_VARIABLES } from '@/legal/templates/full-repayment-confirmation';

export interface DocumentTemplate {
  readonly type: DocumentType;
  readonly version: string;
  readonly title: string;
  readonly template: string;
  readonly variables: readonly string[];
}

/** Registry of all available templates, keyed by document type. */
const templateRegistry = new Map<DocumentType, DocumentTemplate>();

// Register all templates
templateRegistry.set('loan_contract', {
  type: 'loan_contract',
  version: LOAN_CONTRACT_TEMPLATE_VERSION,
  title: 'Договор денежного займа',
  template: LOAN_CONTRACT_TEMPLATE,
  variables: LOAN_CONTRACT_VARIABLES,
});

templateRegistry.set('tranche_receipt', {
  type: 'tranche_receipt',
  version: TRANCHE_RECEIPT_TEMPLATE_VERSION,
  title: 'Расписка о получении транша',
  template: TRANCHE_RECEIPT_TEMPLATE,
  variables: TRANCHE_RECEIPT_VARIABLES,
});

templateRegistry.set('appendix_bank_details', {
  type: 'appendix_bank_details',
  version: APPENDIX_BANK_DETAILS_TEMPLATE_VERSION,
  title: 'Приложение 1: Допустимые реквизиты',
  template: APPENDIX_BANK_DETAILS_TEMPLATE,
  variables: APPENDIX_BANK_DETAILS_VARIABLES,
});

templateRegistry.set('appendix_repayment_schedule', {
  type: 'appendix_repayment_schedule',
  version: APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE_VERSION,
  title: 'Приложение 2: График возврата',
  template: APPENDIX_REPAYMENT_SCHEDULE_TEMPLATE,
  variables: APPENDIX_REPAYMENT_SCHEDULE_VARIABLES,
});

templateRegistry.set('partial_repayment_confirmation', {
  type: 'partial_repayment_confirmation',
  version: PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION,
  title: 'Подтверждение частичного погашения',
  template: PARTIAL_REPAYMENT_CONFIRMATION_TEMPLATE,
  variables: PARTIAL_REPAYMENT_CONFIRMATION_VARIABLES,
});

templateRegistry.set('full_repayment_confirmation', {
  type: 'full_repayment_confirmation',
  version: FULL_REPAYMENT_CONFIRMATION_TEMPLATE_VERSION,
  title: 'Подтверждение полного погашения',
  template: FULL_REPAYMENT_CONFIRMATION_TEMPLATE,
  variables: FULL_REPAYMENT_CONFIRMATION_VARIABLES,
});

export function getTemplate(type: DocumentType): DocumentTemplate | undefined {
  return templateRegistry.get(type);
}

export function getAvailableDocumentTypes(): DocumentType[] {
  return Array.from(templateRegistry.keys());
}

export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_CONFIGS[type]?.label ?? type;
}
