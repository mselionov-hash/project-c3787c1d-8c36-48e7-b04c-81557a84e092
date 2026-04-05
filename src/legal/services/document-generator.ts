/**
 * Document generator orchestrator.
 * Gathers data → resolves template variables → renders text → generates PDF → persists metadata.
 */

import { supabase } from '@/integrations/supabase/client';
import { getTemplate } from '@/legal/document-registry';
import { renderTemplate, validateRenderedOutput } from './template-engine';
import {
  resolveContractVariables,
  resolveTrancheReceiptVariables,
  resolveAppendixBankDetailsVariables,
  resolveAppendixScheduleVariables,
  resolvePartialRepaymentVariables,
  resolveFullRepaymentVariables,
  resolveApp6Variables,
  resolveEdoRegulationVariables,
} from './variable-resolver';
import { renderDocumentToPdf } from './pdf-renderer';
import type { DocumentType } from '@/legal/document-types';

interface GenerateResult {
  documentId: string;
  resolvedText: string;
}

/**
 * Common helper: render template, validate, persist metadata, generate PDF.
 */
async function generateDocument(
  loanId: string,
  userId: string,
  documentType: DocumentType,
  resolverFn: () => Promise<Record<string, string>>,
  pdfOptions: { title: string; fileNamePrefix: string },
  sourceEntityId?: string
): Promise<GenerateResult> {
  const template = getTemplate(documentType);
  if (!template) throw new Error(`Template not found: ${documentType}`);

  const variables = await resolverFn();
  const resolvedText = renderTemplate(template.template, variables);

  const renderIssues = validateRenderedOutput(resolvedText);
  if (renderIssues.length > 0) {
    throw new Error(`Документ содержит нерезолвленные элементы шаблона:\n${renderIssues.join('\n')}`);
  }

  const contractNumber = variables['CONTRACT_NUMBER'] || loanId.slice(0, 8);

  const { data, error } = await supabase
    .from('generated_documents')
    .insert({
      loan_id: loanId,
      document_type: documentType as string,
      template_version: template.version,
      created_by: userId,
      source_entity_id: sourceEntityId || null,
      render_data_snapshot: JSON.parse(JSON.stringify(variables)),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save document metadata: ${error.message}`);

  renderDocumentToPdf(resolvedText, {
    title: `${pdfOptions.title} ${contractNumber}`,
    fileName: `${pdfOptions.fileNamePrefix}-${contractNumber}.pdf`,
  });

  return { documentId: data.id, resolvedText };
}

/**
 * Generate a loan contract document.
 */
export async function generateLoanContract(
  loanId: string,
  userId: string
): Promise<GenerateResult> {
  const { data: sigs } = await supabase
    .from('loan_signatures')
    .select('role')
    .eq('loan_id', loanId);

  const roles = new Set((sigs || []).map(s => s.role));
  if (!roles.has('lender') || !roles.has('borrower')) {
    throw new Error('Договор можно сформировать только после подписания обеими сторонами');
  }

  return generateDocument(
    loanId, userId, 'loan_contract',
    () => resolveContractVariables(loanId),
    { title: 'Договор займа №', fileNamePrefix: 'договор-займа' }
  );
}

/**
 * Generate a tranche receipt document.
 */
export async function generateTrancheReceipt(
  loanId: string,
  trancheId: string,
  userId: string
): Promise<GenerateResult> {
  const { data: tranche } = await supabase
    .from('loan_tranches')
    .select('status')
    .eq('id', trancheId)
    .single();

  if (!tranche || tranche.status !== 'confirmed') {
    throw new Error('Расписку можно сформировать только для подтверждённого транша');
  }

  return generateDocument(
    loanId, userId, 'tranche_receipt',
    () => resolveTrancheReceiptVariables(loanId, trancheId),
    { title: 'Расписка транш', fileNamePrefix: 'расписка-транш' },
    trancheId
  );
}

/**
 * Generate Appendix 1 — allowed bank details.
 */
export async function generateAppendixBankDetails(
  loanId: string,
  userId: string
): Promise<GenerateResult> {
  const { data: sigs } = await supabase
    .from('loan_signatures')
    .select('role')
    .eq('loan_id', loanId);

  const roles = new Set((sigs || []).map(s => s.role));
  if (!roles.has('lender') || !roles.has('borrower')) {
    throw new Error('Приложение 1 можно сформировать только после подписания договора обеими сторонами');
  }

  return generateDocument(
    loanId, userId, 'appendix_bank_details',
    () => resolveAppendixBankDetailsVariables(loanId),
    { title: 'Приложение 1 к договору №', fileNamePrefix: 'приложение-1-реквизиты' }
  );
}

/**
 * Generate Appendix 2 — repayment schedule.
 */
export async function generateAppendixSchedule(
  loanId: string,
  userId: string
): Promise<GenerateResult> {
  const { data: sigs } = await supabase
    .from('loan_signatures')
    .select('role')
    .eq('loan_id', loanId);

  const roles = new Set((sigs || []).map(s => s.role));
  if (!roles.has('lender') || !roles.has('borrower')) {
    throw new Error('Приложение 2 можно сформировать только после подписания договора обеими сторонами');
  }

  return generateDocument(
    loanId, userId, 'appendix_repayment_schedule',
    () => resolveAppendixScheduleVariables(loanId),
    { title: 'Приложение 2 к договору №', fileNamePrefix: 'приложение-2-график' }
  );
}

/**
 * Generate partial repayment confirmation.
 */
export async function generatePartialRepaymentConfirmation(
  loanId: string,
  paymentId: string,
  userId: string
): Promise<GenerateResult> {
  return generateDocument(
    loanId, userId, 'partial_repayment_confirmation',
    () => resolvePartialRepaymentVariables(loanId, paymentId),
    { title: 'Подтверждение частичного погашения по договору №', fileNamePrefix: 'подтверждение-частичного-погашения' },
    paymentId
  );
}

/**
 * Generate full repayment confirmation.
 */
export async function generateFullRepaymentConfirmation(
  loanId: string,
  userId: string
): Promise<GenerateResult> {
  return generateDocument(
    loanId, userId, 'full_repayment_confirmation',
    () => resolveFullRepaymentVariables(loanId),
    { title: 'Подтверждение полного погашения по договору №', fileNamePrefix: 'подтверждение-полного-погашения' }
  );
}

/**
 * Generate APP6 — UNEP Agreement (Приложение 6).
 */
export async function generateUnepAgreement(
  loanId: string,
  userId: string
): Promise<GenerateResult> {
  return generateDocument(
    loanId, userId, 'unep_agreement',
    () => resolveApp6Variables(loanId),
    { title: 'Приложение 6 к договору №', fileNamePrefix: 'приложение-6-унэп' }
  );
}

/**
 * Generate EDO Regulation document (platform-level, non-personalized).
 * Note: This is a platform-wide document, not per-loan.
 * The loanId is used only for document storage association.
 */
export async function generateEdoRegulation(
  loanId: string,
  userId: string
): Promise<GenerateResult> {
  return generateDocument(
    loanId, userId, 'edo_regulation',
    () => resolveEdoRegulationVariables(),
    { title: 'Регламент ЭДО', fileNamePrefix: 'регламент-эдо' }
  );
}
