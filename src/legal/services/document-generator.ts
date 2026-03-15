/**
 * Document generator orchestrator.
 * Gathers data → resolves template variables → renders text → generates PDF → persists metadata.
 */

import { supabase } from '@/integrations/supabase/client';
import { getTemplate } from '@/legal/document-registry';
import { renderTemplate } from './template-engine';
import { resolveContractVariables, resolveTrancheReceiptVariables } from './variable-resolver';
import { renderDocumentToPdf } from './pdf-renderer';
import type { DocumentType } from '@/legal/document-types';

interface GenerateResult {
  documentId: string;
  resolvedText: string;
}

/**
 * Generate a loan contract document:
 * 1. Resolve all variables from snapshots + live data
 * 2. Render the template
 * 3. Generate PDF and trigger download
 * 4. Persist metadata to generated_documents
 */
export async function generateLoanContract(
  loanId: string,
  userId: string
): Promise<GenerateResult> {
  // Gate: both parties must have signed
  const { data: sigs } = await supabase
    .from('loan_signatures')
    .select('role')
    .eq('loan_id', loanId);

  const roles = new Set((sigs || []).map(s => s.role));
  if (!roles.has('lender') || !roles.has('borrower')) {
    throw new Error('Договор можно сформировать только после подписания обеими сторонами');
  }

  const template = getTemplate('loan_contract');
  if (!template) throw new Error('Loan contract template not found');

  const variables = await resolveContractVariables(loanId);
  const resolvedText = renderTemplate(template.template, variables);

  // Persist document metadata (one row per generation for audit trail)
  const { data, error } = await supabase
    .from('generated_documents')
    .insert({
      loan_id: loanId,
      document_type: 'loan_contract' as DocumentType,
      template_version: template.version,
      created_by: userId,
      render_data_snapshot: JSON.parse(JSON.stringify(variables)),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save document metadata: ${error.message}`);

  const contractNumber = variables['CONTRACT_NUMBER'] || loanId.slice(0, 8);
  renderDocumentToPdf(resolvedText, {
    title: `Договор займа № ${contractNumber}`,
    fileName: `договор-займа-${contractNumber}.pdf`,
  });

  return { documentId: data.id, resolvedText };
}

/**
 * Generate a tranche receipt document.
 */
export async function generateTrancheReceipt(
  loanId: string,
  trancheId: string,
  userId: string
): Promise<GenerateResult> {
  const template = getTemplate('tranche_receipt');
  if (!template) throw new Error('Tranche receipt template not found');

  const variables = await resolveTrancheReceiptVariables(loanId, trancheId);
  const resolvedText = renderTemplate(template.template, variables);

  // Persist document metadata
  const { data, error } = await supabase
    .from('generated_documents')
    .insert({
      loan_id: loanId,
      document_type: 'tranche_receipt' as DocumentType,
      template_version: template.version,
      created_by: userId,
      source_entity_id: trancheId,
      render_data_snapshot: JSON.parse(JSON.stringify(variables)),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save document metadata: ${error.message}`);

  const contractNumber = variables['CONTRACT_NUMBER'] || loanId.slice(0, 8);
  const receiptNumber = variables['TRANCHE_RECEIPT_NUMBER'] || '1';
  renderDocumentToPdf(resolvedText, {
    title: `Расписка о получении транша № ${receiptNumber}`,
    fileName: `расписка-транш-${receiptNumber}-${contractNumber}.pdf`,
  });

  return { documentId: data.id, resolvedText };
}
