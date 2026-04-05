/**
 * Variable resolver: gathers data from snapshots, loan, tranches, signatures,
 * bank details and produces a flat VariableRecord for the template engine.
 */

import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_CONFIG } from './platform-config';
import { amountToWordsRu } from './number-to-words-ru';
import type { VariableRecord } from './template-engine';
import type { Tables, Json } from '@/integrations/supabase/types';
import { applyAliases } from '../variables/aliases';
import { getOfferorRole, getOffereeRole, getRoleLabel } from './deal-logic';
import { getSignatureSchemeLabel, isAppendix6Required } from './signature-scheme';
import { getCurrentRegulation } from './regulation-service';

type Loan = Tables<'loans'>;
type Tranche = Tables<'loan_tranches'>;
type Signature = Tables<'loan_signatures'>;
type Payment = Tables<'loan_payments'>;

interface ProfileSnapshot {
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  passport_series: string | null;
  passport_number: string | null;
  passport_issued_by: string | null;
  passport_issue_date: string | null;
  passport_division_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface BankDetailSnapshotItem {
  bank_detail_id: string;
  bank_name: string;
  card_number: string | null;
  phone: string | null;
  account_number: string | null;
  bik: string | null;
  recipient_display_name: string | null;
  purpose: string;
  party_role: string;
}

interface AllowedBankDetailsSnapshotData {
  loan_id: string;
  details: BankDetailSnapshotItem[];
}

function formatDateRu(dateStr: string | null): string {
  if (!dateStr) return '___________';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateTimeRu(dateStr: string | null): string {
  if (!dateStr) return '___________';
  try {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function renderSignatureBlock(sig: Signature | undefined, role: string): string {
  if (!sig) return '[подпись не проставлена]';
  const dateStr = formatDateTimeRu(sig.signed_at);
  const ipStr = sig.signer_ip ? ` | IP: ${sig.signer_ip}` : '';
  const roleLabel = role === 'lender' ? 'Займодавец' : 'Заёмщик';
  return `Электронная подпись (${roleLabel}): подписано ${dateStr}${ipStr}\n(простая электронная подпись на Платформе; не является УКЭП)`;
}

function renderBankDetailsTable(details: BankDetailSnapshotItem[], purpose: string, partyRole: string): string {
  const filtered = details.filter(d => d.purpose === purpose && d.party_role === partyRole);
  if (filtered.length === 0) return '[реквизиты не указаны]';

  return filtered.map((d, i) => {
    const parts = [`${i + 1}. ${d.bank_name}`];
    if (d.account_number) parts.push(`   Расчетный счет: ${d.account_number}`);
    if (d.bik) parts.push(`   БИК: ${d.bik}`);
    if (d.card_number) parts.push(`   Карта: ${d.card_number}`);
    if (d.phone) parts.push(`   Телефон (СБП): ${d.phone}`);
    if (d.recipient_display_name) parts.push(`   Получатель: ${d.recipient_display_name}`);
    return parts.join('\n');
  }).join('\n\n');
}

function renderNoticeTable(lenderProfile: ProfileSnapshot, borrowerProfile: ProfileSnapshot): string {
  const rows = [
    'Канал связи | Займодавец | Заемщик',
    '---|---|---',
    `Email | ${lenderProfile.email || '—'} | ${borrowerProfile.email || '—'}`,
    `Телефон | ${lenderProfile.phone || '—'} | ${borrowerProfile.phone || '—'}`,
    `Адрес | ${lenderProfile.address || '—'} | ${borrowerProfile.address || '—'}`,
    `ID на Платформе | ${lenderProfile.user_id} | ${borrowerProfile.user_id}`,
  ];
  return rows.join('\n');
}

function renderScheduleTable(items: Tables<'payment_schedule_items'>[]): string {
  if (items.length === 0) return '[график платежей не сформирован]';
  const rows = [
    '№ | Дата | Основной долг | Проценты | Итого',
    '---|---|---|---|---',
    ...items.map(item =>
      `${item.item_number} | ${formatDateRu(item.due_date)} | ${Number(item.principal_amount).toLocaleString('ru-RU')} ₽ | ${Number(item.interest_amount).toLocaleString('ru-RU')} ₽ | ${Number(item.total_amount).toLocaleString('ru-RU')} ₽`
    ),
  ];
  return rows.join('\n');
}

function safeJsonCast<T>(json: Json): T {
  return json as unknown as T;
}

/**
 * Resolve all variables for a loan contract document.
 */
export async function resolveContractVariables(loanId: string): Promise<VariableRecord> {
  // Fetch all needed data in parallel
  const [loanRes, sigRes, snapshotsRes, scheduleRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('loan_signatures').select('*').eq('loan_id', loanId),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('payment_schedule_items').select('*').eq('loan_id', loanId).order('item_number'),
  ]);

  const loan = loanRes.data;
  if (!loan) throw new Error('Loan not found');

  const signatures = sigRes.data || [];
  const snapshots = snapshotsRes.data || [];
  const scheduleItems = scheduleRes.data || [];

  // Extract snapshots
  const lenderProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'lender');
  const borrowerProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'borrower');
  const bankDetailsSnap = snapshots.find(s => s.snapshot_type === 'allowed_bank_details');

  if (!lenderProfileSnap || !borrowerProfileSnap) {
    throw new Error('Снимки профилей сторон не найдены. Договор должен быть подписан обеими сторонами перед генерацией документа.');
  }

  const lenderProfile: ProfileSnapshot = safeJsonCast<ProfileSnapshot>(lenderProfileSnap.snapshot_data);
  const borrowerProfile: ProfileSnapshot = safeJsonCast<ProfileSnapshot>(borrowerProfileSnap.snapshot_data);

  const bankDetails: BankDetailSnapshotItem[] = bankDetailsSnap
    ? safeJsonCast<AllowedBankDetailsSnapshotData>(bankDetailsSnap.snapshot_data).details
    : [];

  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');
  const lastSignatureAt = signatures.length > 0
    ? signatures.reduce((latest, s) => s.signed_at > latest ? s.signed_at : latest, signatures[0].signed_at)
    : null;

  const vars: VariableRecord = {
    // Contract metadata
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_PLACE: loan.city,
    CONTRACT_DATE: formatDateRu(loan.issue_date || loan.created_at),
    LAST_SIGNATURE_AT: lastSignatureAt ? formatDateTimeRu(lastSignatureAt) : '[ожидается подписание]',

    // Lender profile
    LENDER_FULL_NAME: lenderProfile.full_name,
    LENDER_DOB: formatDateRu(lenderProfile.date_of_birth),
    LENDER_PASSPORT_SERIES: lenderProfile.passport_series || '____',
    LENDER_PASSPORT_NUMBER: lenderProfile.passport_number || '______',
    LENDER_PASSPORT_ISSUED_BY: lenderProfile.passport_issued_by || '___________',
    LENDER_PASSPORT_ISSUE_DATE: formatDateRu(lenderProfile.passport_issue_date),
    LENDER_PASSPORT_DIVISION_CODE: lenderProfile.passport_division_code || '___-___',
    LENDER_REG_ADDRESS: lenderProfile.address || '___________',
    LENDER_CONTACT_PHONE: lenderProfile.phone || '___________',
    LENDER_EMAIL: lenderProfile.email || '___________',
    LENDER_APP_ACCOUNT_ID: lenderProfile.user_id,

    // Borrower profile
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    BORROWER_DOB: formatDateRu(borrowerProfile.date_of_birth),
    BORROWER_PASSPORT_SERIES: borrowerProfile.passport_series || '____',
    BORROWER_PASSPORT_NUMBER: borrowerProfile.passport_number || '______',
    BORROWER_PASSPORT_ISSUED_BY: borrowerProfile.passport_issued_by || '___________',
    BORROWER_PASSPORT_ISSUE_DATE: formatDateRu(borrowerProfile.passport_issue_date),
    BORROWER_PASSPORT_DIVISION_CODE: borrowerProfile.passport_division_code || '___-___',
    BORROWER_REG_ADDRESS: borrowerProfile.address || '___________',
    BORROWER_CONTACT_PHONE: borrowerProfile.phone || '___________',
    BORROWER_EMAIL: borrowerProfile.email || '___________',
    BORROWER_APP_ACCOUNT_ID: borrowerProfile.user_id,

    // Loan terms
    LOAN_AMOUNT: Number(loan.amount).toLocaleString('ru-RU'),
    LOAN_AMOUNT_IN_WORDS: amountToWordsRu(Number(loan.amount)),
    LOAN_CURRENCY: PLATFORM_CONFIG.LOAN_CURRENCY,
    INTEREST_MODE: loan.interest_mode.toUpperCase(),
    INTEREST_RATE_ANNUAL: String(Number(loan.interest_rate)),
    DAY_COUNT_BASIS: PLATFORM_CONFIG.DAY_COUNT_BASIS,
    INTEREST_PAYMENT_SCHEDULE: (loan.interest_payment_schedule || '').toUpperCase(),
    EARLY_REPAYMENT_NOTICE_DAYS: String(loan.early_repayment_notice_days),
    FINAL_REPAYMENT_DEADLINE: formatDateRu(loan.repayment_date),
    REPAYMENT_SCHEDULE_TYPE: loan.repayment_schedule_type.toUpperCase(),

    // Platform config
    PLATFORM_NAME: PLATFORM_CONFIG.PLATFORM_NAME,
    PLATFORM_BRAND_NAME: PLATFORM_CONFIG.PLATFORM_BRAND_NAME,
    PLATFORM_URL: PLATFORM_CONFIG.PLATFORM_URL,
    PLATFORM_OPERATOR_NAME: PLATFORM_CONFIG.PLATFORM_OPERATOR_NAME,
    DISBURSEMENT_REFERENCE_RULE: PLATFORM_CONFIG.DISBURSEMENT_REFERENCE_RULE,
    PAYMENT_REFERENCE_RULE: PLATFORM_CONFIG.PAYMENT_REFERENCE_RULE,
    CONTRACT_LANGUAGE: PLATFORM_CONFIG.CONTRACT_LANGUAGE,
    INTEREST_ACCRUAL_START: PLATFORM_CONFIG.INTEREST_ACCRUAL_START,
    EARLY_REPAYMENT_INTEREST_RULE: PLATFORM_CONFIG.EARLY_REPAYMENT_INTEREST_RULE,

    // TZ v2.2: deal and signature scheme
    DEAL_VERSION: String((loan as any).deal_version ?? 1),
    INITIATOR_ROLE: (loan as any).initiator_role ?? 'lender',
    LOAN_TYPE: (loan as any).loan_type ?? PLATFORM_CONFIG.LOAN_TYPE,
    SIGNATURE_SCHEME_REQUESTED: (loan as any).signature_scheme_requested ?? 'UKEP_ONLY',
    BORROWER_DISBURSEMENT_RECEIPT_POLICY: (loan as any).borrower_disbursement_receipt_policy ?? 'BANK_TRANSFER_ONLY',
    LENDER_REPAYMENT_RECEIPT_POLICY: (loan as any).lender_repayment_receipt_policy ?? 'BANK_TRANSFER_ONLY',

    // TZ v2.2: derived deal/scheme variables
    OFFEROR_ROLE: getOfferorRole((loan as any).initiator_role ?? 'lender', (loan as any).deal_version ?? 1),
    OFFEREE_ROLE: getOffereeRole(getOfferorRole((loan as any).initiator_role ?? 'lender', (loan as any).deal_version ?? 1)),
    SIGNATURE_SCHEME_LABEL: getSignatureSchemeLabel((loan as any).signature_scheme_requested ?? 'UKEP_ONLY'),
    APPENDIX_6_REFERENCE: isAppendix6Required((loan as any).signature_scheme_requested ?? 'UKEP_ONLY')
      ? 'Приложение № 6 (Соглашение об использовании УНЭП) является неотъемлемой частью настоящего Договора.'
      : '',
    SNAPSHOT_VERSION_LABEL: `Версия ${(loan as any).deal_version ?? 1}`,

    // Render blocks: bank details tables
    'ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS_TABLE': renderBankDetailsTable(bankDetails, 'disbursement', 'lender'),
    'ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS': renderBankDetailsTable(bankDetails, 'disbursement', 'lender'),
    'ALLOWED_BORROWER_RECEIVING_ACCOUNTS_TABLE': renderBankDetailsTable(bankDetails, 'disbursement', 'borrower'),
    'ALLOWED_BORROWER_RECEIVING_ACCOUNTS': renderBankDetailsTable(bankDetails, 'disbursement', 'borrower'),
    'ALLOWED_LENDER_RECEIVING_ACCOUNTS_TABLE': renderBankDetailsTable(bankDetails, 'repayment', 'lender'),
    'ALLOWED_LENDER_RECEIVING_ACCOUNTS': renderBankDetailsTable(bankDetails, 'repayment', 'lender'),

    // Render blocks: notice and schedule
    NOTICE_SNAPSHOT_TABLE: renderNoticeTable(lenderProfile, borrowerProfile),
    SCHEDULE_TABLE: renderScheduleTable(scheduleItems),

    // Signature blocks
    LENDER_SIGNATURE_BLOCK: renderSignatureBlock(lenderSig, 'lender'),
    BORROWER_SIGNATURE_BLOCK: renderSignatureBlock(borrowerSig, 'borrower'),
  };

  return applyAliases(vars);
}

/**
 * Resolve all variables for a tranche receipt document.
 */
export async function resolveTrancheReceiptVariables(
  loanId: string,
  trancheId: string
): Promise<VariableRecord> {
  const [loanRes, trancheRes, sigRes, snapshotsRes, existingDocsRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('loan_tranches').select('*').eq('id', trancheId).single(),
    supabase.from('loan_signatures').select('*').eq('loan_id', loanId),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('generated_documents').select('id').eq('loan_id', loanId).eq('document_type', 'tranche_receipt'),
  ]);

  const loan = loanRes.data;
  const tranche = trancheRes.data;
  if (!loan) throw new Error('Loan not found');
  if (!tranche) throw new Error('Tranche not found');

  const signatures = sigRes.data || [];
  const snapshots = snapshotsRes.data || [];
  const existingDocs = existingDocsRes.data || [];

  // Extract snapshots
  const lenderProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'lender');
  const borrowerProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'borrower');

  if (!lenderProfileSnap || !borrowerProfileSnap) {
    throw new Error('Снимки профилей сторон не найдены. Договор должен быть подписан обеими сторонами перед генерацией расписки.');
  }

  const lenderProfile: ProfileSnapshot = safeJsonCast<ProfileSnapshot>(lenderProfileSnap.snapshot_data);
  const borrowerProfile: ProfileSnapshot = safeJsonCast<ProfileSnapshot>(borrowerProfileSnap.snapshot_data);

  const lastSignatureAt = signatures.length > 0
    ? signatures.reduce((latest, s) => s.signed_at > latest ? s.signed_at : latest, signatures[0].signed_at)
    : null;

  const borrowerSig = signatures.find(s => s.role === 'borrower');
  const receiptNumber = existingDocs.length + 1;

  const methodKey = tranche.method === 'sbp' ? 'SBP' : 'BANK_TRANSFER';

  const vars: VariableRecord = {
    RECEIPT_TITLE: PLATFORM_CONFIG.RECEIPT_TITLE,
    TRANCHE_RECEIPT_NUMBER: String(receiptNumber),
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    TRANCHE_RECEIPT_DRAFT_CREATED_AT: formatDateTimeRu(new Date().toISOString()),
    TRANCHE_RECEIPT_SIGNED_AT: tranche.confirmed_at ? formatDateTimeRu(tranche.confirmed_at) : '[ожидается подписание]',

    // Lender
    LENDER_FULL_NAME: lenderProfile.full_name,
    LENDER_DOB: formatDateRu(lenderProfile.date_of_birth),
    LENDER_PASSPORT_SERIES: lenderProfile.passport_series || '____',
    LENDER_PASSPORT_NUMBER: lenderProfile.passport_number || '______',
    LENDER_PASSPORT_ISSUED_BY: lenderProfile.passport_issued_by || '___________',
    LENDER_PASSPORT_ISSUE_DATE: formatDateRu(lenderProfile.passport_issue_date),
    LENDER_PASSPORT_DIVISION_CODE: lenderProfile.passport_division_code || '___-___',
    LENDER_REG_ADDRESS: lenderProfile.address || '___________',
    LENDER_CONTACT_PHONE: lenderProfile.phone || '___________',
    LENDER_EMAIL: lenderProfile.email || '___________',
    LENDER_APP_ACCOUNT_ID: lenderProfile.user_id,

    // Borrower
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    BORROWER_DOB: formatDateRu(borrowerProfile.date_of_birth),
    BORROWER_PASSPORT_SERIES: borrowerProfile.passport_series || '____',
    BORROWER_PASSPORT_NUMBER: borrowerProfile.passport_number || '______',
    BORROWER_PASSPORT_ISSUED_BY: borrowerProfile.passport_issued_by || '___________',
    BORROWER_PASSPORT_ISSUE_DATE: formatDateRu(borrowerProfile.passport_issue_date),
    BORROWER_PASSPORT_DIVISION_CODE: borrowerProfile.passport_division_code || '___-___',
    BORROWER_REG_ADDRESS: borrowerProfile.address || '___________',
    BORROWER_CONTACT_PHONE: borrowerProfile.phone || '___________',
    BORROWER_EMAIL: borrowerProfile.email || '___________',
    BORROWER_APP_ACCOUNT_ID: borrowerProfile.user_id,

    // Platform
    PLATFORM_NAME: PLATFORM_CONFIG.PLATFORM_NAME,
    PLATFORM_URL: PLATFORM_CONFIG.PLATFORM_URL,
    PLATFORM_OPERATOR_NAME: PLATFORM_CONFIG.PLATFORM_OPERATOR_NAME,

    // Contract references
    CONTRACT_DATE: formatDateRu(loan.issue_date || loan.created_at),
    LAST_SIGNATURE_AT: lastSignatureAt ? formatDateTimeRu(lastSignatureAt) : '[ожидается подписание]',

    // Tranche fields
    TRANCHE_ID: tranche.id,
    TRANCHE_AMOUNT: Number(tranche.amount).toLocaleString('ru-RU'),
    TRANCHE_AMOUNT_IN_WORDS: amountToWordsRu(Number(tranche.amount)),
    TRANCHE_CURRENCY: tranche.currency || 'руб.',
    TRANCHE_DATE: formatDateRu(tranche.actual_date || tranche.planned_date),
    TRANCHE_TIME: tranche.actual_time || '—',
    TRANCHE_TIMEZONE: tranche.timezone || 'Europe/Moscow',
    TRANCHE_METHOD: methodKey,
    TRANCHE_SENDER_ACCOUNT_DISPLAY: tranche.sender_account_display || '[не указано]',
    TRANCHE_RECEIVER_ACCOUNT_DISPLAY: tranche.receiver_account_display || '[не указано]',
    TRANCHE_REFERENCE_TEXT: tranche.reference_text || `По договору займа № ${loan.contract_number || loan.id.slice(0, 8).toUpperCase()}`,
    TRANCHE_BANK_DOCUMENT_ID: tranche.bank_document_id || '[не указано]',
    TRANCHE_BANK_DOCUMENT_DATE: formatDateRu(tranche.bank_document_date),
    TRANCHE_TRANSFER_SOURCE: tranche.transfer_source || 'MANUAL',

    // Conditional flags
    LENDER_CO_SIGNATURE_ENABLED: PLATFORM_CONFIG.LENDER_CO_SIGNATURE_ENABLED,
    PAYMENT_PROOF_ATTACHMENT_ENABLED: PLATFORM_CONFIG.PAYMENT_PROOF_ATTACHMENT_ENABLED,

    // Signature blocks
    BORROWER_SIGNATURE_BLOCK: renderSignatureBlock(borrowerSig, 'borrower'),
    LENDER_SIGNATURE_BLOCK_OPTIONAL: '[не требуется]',
  };

  return applyAliases(vars);
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  no_schedule_single_deadline: 'Единый срок возврата',
  installments_fixed: 'Рассрочка фиксированными платежами',
  installments_variable: 'Рассрочка переменными платежами',
};

const REPAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Банковский перевод',
  sbp: 'Перевод через СБП',
};

/**
 * Resolve variables for Appendix 1 — allowed bank details.
 */
export async function resolveAppendixBankDetailsVariables(loanId: string): Promise<VariableRecord> {
  const [loanRes, snapshotsRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
  ]);

  const loan = loanRes.data;
  if (!loan) throw new Error('Loan not found');

  const snapshots = snapshotsRes.data || [];
  const lenderProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'lender');
  const borrowerProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'borrower');
  const bankDetailsSnap = snapshots.find(s => s.snapshot_type === 'allowed_bank_details');

  if (!lenderProfileSnap || !borrowerProfileSnap) {
    throw new Error('Снимки профилей сторон не найдены.');
  }

  const lenderProfile = safeJsonCast<ProfileSnapshot>(lenderProfileSnap.snapshot_data);
  const borrowerProfile = safeJsonCast<ProfileSnapshot>(borrowerProfileSnap.snapshot_data);
  const bankDetails: BankDetailSnapshotItem[] = bankDetailsSnap
    ? safeJsonCast<AllowedBankDetailsSnapshotData>(bankDetailsSnap.snapshot_data).details
    : [];

  return applyAliases({
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    APPENDIX_DATE: formatDateTimeRu(new Date().toISOString()),
    LENDER_DISBURSEMENT_ACCOUNTS: renderBankDetailsTable(bankDetails, 'disbursement', 'lender'),
    BORROWER_DISBURSEMENT_ACCOUNTS: renderBankDetailsTable(bankDetails, 'disbursement', 'borrower'),
    LENDER_REPAYMENT_ACCOUNTS: renderBankDetailsTable(bankDetails, 'repayment', 'lender'),
    BORROWER_REPAYMENT_ACCOUNTS: renderBankDetailsTable(bankDetails, 'repayment', 'borrower'),
    NOTICE_SNAPSHOT_TABLE: renderNoticeTable(lenderProfile, borrowerProfile),
  });
}

/**
 * Resolve variables for Appendix 2 — repayment schedule.
 */
export async function resolveAppendixScheduleVariables(loanId: string): Promise<VariableRecord> {
  const [loanRes, scheduleRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('payment_schedule_items').select('*').eq('loan_id', loanId).order('item_number'),
  ]);

  const loan = loanRes.data;
  if (!loan) throw new Error('Loan not found');

  const scheduleItems = scheduleRes.data || [];
  if (scheduleItems.length === 0) {
    throw new Error('График платежей не сформирован. Создайте записи графика перед генерацией Приложения 2.');
  }

  return applyAliases({
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    APPENDIX_DATE: formatDateTimeRu(new Date().toISOString()),
    SCHEDULE_TYPE_LABEL: SCHEDULE_TYPE_LABELS[loan.repayment_schedule_type] || loan.repayment_schedule_type,
    LOAN_AMOUNT: Number(loan.amount).toLocaleString('ru-RU'),
    LOAN_AMOUNT_IN_WORDS: amountToWordsRu(Number(loan.amount)),
    LOAN_CURRENCY: PLATFORM_CONFIG.LOAN_CURRENCY,
    INTEREST_MODE: loan.interest_mode.toUpperCase(),
    INTEREST_RATE_ANNUAL: String(Number(loan.interest_rate)),
    FINAL_REPAYMENT_DEADLINE: formatDateRu(loan.repayment_date),
    SCHEDULE_TABLE: renderScheduleTable(scheduleItems),
  });
}

/**
 * Resolve variables for partial repayment confirmation.
 */
export async function resolvePartialRepaymentVariables(
  loanId: string,
  paymentId: string
): Promise<VariableRecord> {
  const [loanRes, paymentRes, tranchesRes, allPaymentsRes, snapshotsRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('loan_payments').select('*').eq('id', paymentId).single(),
    supabase.from('loan_tranches').select('*').eq('loan_id', loanId).eq('status', 'confirmed'),
    supabase.from('loan_payments').select('*').eq('loan_id', loanId).eq('status', 'confirmed'),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
  ]);

  const loan = loanRes.data;
  const payment = paymentRes.data;
  if (!loan) throw new Error('Loan not found');
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'confirmed') throw new Error('Подтверждение можно сформировать только для подтверждённого платежа.');

  const snapshots = snapshotsRes.data || [];
  const lenderSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'lender');
  const borrowerSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'borrower');
  if (!lenderSnap || !borrowerSnap) throw new Error('Снимки профилей сторон не найдены.');

  const lenderProfile = safeJsonCast<ProfileSnapshot>(lenderSnap.snapshot_data);
  const borrowerProfile = safeJsonCast<ProfileSnapshot>(borrowerSnap.snapshot_data);

  const totalDisbursed = (tranchesRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
  const totalRepaid = (allPaymentsRes.data || []).reduce((s, p) => s + Number(p.transfer_amount), 0);
  const remaining = Math.max(0, totalDisbursed - totalRepaid);

  return applyAliases({
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONFIRMATION_DATE: formatDateTimeRu(new Date().toISOString()),
    LENDER_FULL_NAME: lenderProfile.full_name,
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    REPAYMENT_AMOUNT: Number(payment.transfer_amount).toLocaleString('ru-RU'),
    REPAYMENT_AMOUNT_IN_WORDS: amountToWordsRu(Number(payment.transfer_amount)),
    LOAN_CURRENCY: PLATFORM_CONFIG.LOAN_CURRENCY,
    REPAYMENT_DATE: formatDateRu(payment.transfer_date),
    REPAYMENT_METHOD: REPAYMENT_METHOD_LABELS[payment.transfer_method] || payment.transfer_method,
    HAS_BANK_NAME: payment.bank_name?.trim() ? 'YES' : 'NO',
    REPAYMENT_BANK_NAME: payment.bank_name?.trim() || '',
    HAS_TRANSACTION_ID: payment.transaction_id?.trim() ? 'YES' : 'NO',
    REPAYMENT_TRANSACTION_ID: payment.transaction_id?.trim() || '',
    TOTAL_DISBURSED: totalDisbursed.toLocaleString('ru-RU'),
    TOTAL_REPAID: totalRepaid.toLocaleString('ru-RU'),
    REMAINING_BALANCE: remaining.toLocaleString('ru-RU'),
    LENDER_CONFIRMATION_BLOCK: `Подтверждено на Платформе ${formatDateTimeRu(payment.confirmed_at)}\n(простая электронная подпись на Платформе; не является УКЭП)`,
  });
}

/**
 * Resolve variables for full repayment confirmation.
 */
export async function resolveFullRepaymentVariables(loanId: string): Promise<VariableRecord> {
  const [loanRes, tranchesRes, paymentsRes, snapshotsRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('loan_tranches').select('*').eq('loan_id', loanId).eq('status', 'confirmed'),
    supabase.from('loan_payments').select('*').eq('loan_id', loanId).eq('status', 'confirmed').order('transfer_date', { ascending: false }),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
  ]);

  const loan = loanRes.data;
  if (!loan) throw new Error('Loan not found');

  const snapshots = snapshotsRes.data || [];
  const lenderSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'lender');
  const borrowerSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'borrower');
  if (!lenderSnap || !borrowerSnap) throw new Error('Снимки профилей сторон не найдены.');

  const lenderProfile = safeJsonCast<ProfileSnapshot>(lenderSnap.snapshot_data);
  const borrowerProfile = safeJsonCast<ProfileSnapshot>(borrowerSnap.snapshot_data);

  const totalDisbursed = (tranchesRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
  const confirmedPayments = paymentsRes.data || [];
  const totalRepaid = confirmedPayments.reduce((s, p) => s + Number(p.transfer_amount), 0);

  if (totalDisbursed <= 0) throw new Error('Нет подтверждённых траншей для формирования подтверждения.');
  if (totalRepaid < totalDisbursed) throw new Error('Основной долг ещё не погашен полностью.');

  const lastPayment = confirmedPayments[0];

  return applyAliases({
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONFIRMATION_DATE: formatDateTimeRu(new Date().toISOString()),
    LENDER_FULL_NAME: lenderProfile.full_name,
    LENDER_PASSPORT_SERIES: lenderProfile.passport_series || '____',
    LENDER_PASSPORT_NUMBER: lenderProfile.passport_number || '______',
    LENDER_REG_ADDRESS: lenderProfile.address || '___________',
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    BORROWER_PASSPORT_SERIES: borrowerProfile.passport_series || '____',
    BORROWER_PASSPORT_NUMBER: borrowerProfile.passport_number || '______',
    BORROWER_REG_ADDRESS: borrowerProfile.address || '___________',
    TOTAL_DISBURSED: totalDisbursed.toLocaleString('ru-RU'),
    TOTAL_DISBURSED_IN_WORDS: amountToWordsRu(totalDisbursed),
    TOTAL_REPAID: totalRepaid.toLocaleString('ru-RU'),
    TOTAL_REPAID_IN_WORDS: amountToWordsRu(totalRepaid),
    LOAN_CURRENCY: PLATFORM_CONFIG.LOAN_CURRENCY,
    LAST_REPAYMENT_DATE: lastPayment ? formatDateRu(lastPayment.transfer_date) : '___________',
    LENDER_CONFIRMATION_BLOCK: `Подтверждено на Платформе ${formatDateTimeRu(new Date().toISOString())}\n(простая электронная подпись на Платформе; не является УКЭП)`,
  });
}
