/**
 * Variable resolver: gathers data from snapshots, loan, tranches, signatures,
 * bank details and produces a flat VariableRecord for the template engine.
 */

import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_CONFIG } from './platform-config';
import { amountToWordsRu } from './number-to-words-ru';
import type { VariableRecord, RepeatData, ResolverResult } from './template-engine';
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
 * Format a tranche's sender or receiver requisite into a human-readable printable string.
 */
function formatRequisitePrintable(tranche: Tranche, side: 'sender' | 'receiver'): string {
  const display = side === 'sender'
    ? tranche.sender_account_display
    : tranche.receiver_account_display;
  if (!display) return '[не указано]';
  return display;
}

/**
 * Calculate debt summary for a loan.
 * Returns: totalDisbursed, totalRepaid, activeDebt, outstandingPrincipal.
 * Interest/costs/395 are placeholder zeros for MVP (no interest accrual engine yet).
 */
async function calculateDebtSummary(loanId: string) {
  const [tranchesRes, paymentsRes] = await Promise.all([
    supabase.from('loan_tranches').select('amount').eq('loan_id', loanId).eq('status', 'confirmed'),
    supabase.from('loan_payments').select('transfer_amount').eq('loan_id', loanId).eq('status', 'confirmed'),
  ]);
  const totalDisbursed = (tranchesRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
  const totalRepaid = (paymentsRes.data || []).reduce((s, p) => s + Number(p.transfer_amount), 0);
  const outstandingPrincipal = Math.max(0, totalDisbursed - totalRepaid);
  // MVP: interest/costs/395 computed as 0 — will be replaced by accrual engine
  const outstandingInterest = 0;
  const outstanding395Interest = 0;
  const outstandingCosts = 0;
  const activeDebt = outstandingPrincipal + outstandingInterest + outstanding395Interest + outstandingCosts;
  return { totalDisbursed, totalRepaid, outstandingPrincipal, outstandingInterest, outstanding395Interest, outstandingCosts, activeDebt };
}

/**
 * Resolve all variables for a loan contract document.
 */
export async function resolveContractVariables(loanId: string): Promise<ResolverResult> {
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
    DEAL_ID: loan.id,
    DEAL_CREATED_AT: formatDateTimeRu(loan.created_at),
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

  return { variables: applyAliases(vars), repeatSections: {} };
}

/**
 * Resolve all variables for a tranche receipt document.
 */
export async function resolveTrancheReceiptVariables(
  loanId: string,
  trancheId: string
): Promise<ResolverResult> {
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
    TRANCHE_METHOD_LABEL: methodKey === 'SBP' ? 'Перевод через СБП' : 'Банковский перевод',
    TRANCHE_SENDER_ACCOUNT_DISPLAY: tranche.sender_account_display || '[не указано]',
    TRANCHE_RECEIVER_ACCOUNT_DISPLAY: tranche.receiver_account_display || '[не указано]',
    TRANCHE_REFERENCE_TEXT: tranche.reference_text || `По договору займа № ${loan.contract_number || loan.id.slice(0, 8).toUpperCase()}`,
    TRANCHE_BANK_DOCUMENT_ID: tranche.bank_document_id || '[не указано]',
    TRANCHE_BANK_DOCUMENT_DATE: formatDateRu(tranche.bank_document_date),
    TRANCHE_TRANSFER_SOURCE: tranche.transfer_source || 'MANUAL',

    // TZ v2.2 printable requisite fields
    TRANCHE_SENDER_REQUISITE_PRINTABLE: formatRequisitePrintable(tranche, 'sender'),
    TRANCHE_RECEIVER_REQUISITE_PRINTABLE: formatRequisitePrintable(tranche, 'receiver'),
    TRANCHE_RECEIVER_SBP_ROUTE_PRINTABLE: methodKey === 'SBP'
      ? (tranche.receiver_account_display || '[не указано]')
      : '',

    // Conditional flags
    LENDER_CO_SIGNATURE_ENABLED: PLATFORM_CONFIG.LENDER_CO_SIGNATURE_ENABLED,
    PAYMENT_PROOF_ATTACHMENT_ENABLED: PLATFORM_CONFIG.PAYMENT_PROOF_ATTACHMENT_ENABLED,

    // Signature blocks
    BORROWER_SIGNATURE_BLOCK: renderSignatureBlock(borrowerSig, 'borrower'),
    LENDER_SIGNATURE_BLOCK_OPTIONAL: '[не требуется]',
  };

  return { variables: applyAliases(vars), repeatSections: {} };
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  no_schedule_single_deadline: 'Единый срок возврата',
  installments_fixed: 'Рассрочка фиксированными платежами',
  installments_variable: 'Рассрочка переменными платежами',
};

const REPAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Банковский перевод',
  BANK_TRANSFER: 'Банковский перевод',
  sbp: 'Перевод через СБП',
  SBP: 'Перевод через СБП',
};

const RECEIPT_POLICY_LABELS: Record<string, string> = {
  BANK_TRANSFER_ONLY: 'Только банковский перевод',
  SBP_ONLY: 'Только СБП',
  BANK_TRANSFER_OR_SBP: 'Банковский перевод или СБП',
  ANY: 'Любой допустимый способ',
};

const EDITION_KIND_LABELS: Record<string, string> = {
  INITIAL_SIGNED: 'Первоначальная подписанная',
  AMENDMENT_SIGNED: 'Подписанное изменение',
  CURRENT_DERIVED: 'Текущая расчетная',
  CLOSEOUT_DERIVED: 'Итоговая расчетная',
};

function fmtMoney(n: number): string {
  return n.toLocaleString('ru-RU');
}

/**
 * Build repeater block content for APP1 bank detail rows.
 * Produces pre-rendered table rows for the [[REPEAT:SECTION]] blocks.
 */
function renderApp1BankRows(details: BankDetailSnapshotItem[], purpose: string, partyRole: string): string {
  const filtered = details.filter(d => d.purpose === purpose && d.party_role === partyRole);
  if (filtered.length === 0) return '[реквизиты не указаны]';
  return filtered.map((d, i) => {
    const row = `| ${i + 1} | ${d.recipient_display_name || d.bank_name} | ${d.bank_name} | ${d.bik || '—'} | ${d.account_number || d.card_number || '—'} | — |`;
    return row;
  }).join('\n');
}

/**
 * Resolve variables for Appendix 1 — allowed bank details.
 * Source-aligned with Shablon_APP1_dopustimye_platezhnye_rekvizity_v1_0.docx
 */
export async function resolveAppendixBankDetailsVariables(loanId: string): Promise<VariableRecord> {
  const [loanRes, snapshotsRes, sigRes, sigPkgRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('loan_signatures').select('*').eq('loan_id', loanId),
    supabase.from('signature_packages').select('*').eq('loan_id', loanId).single(),
  ]);

  const loan = loanRes.data;
  if (!loan) throw new Error('Loan not found');

  const snapshots = snapshotsRes.data || [];
  const signatures = sigRes.data || [];
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

  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');

  const sigPkg = sigPkgRes.data;
  const schemeEffective = sigPkg?.signature_scheme_effective ?? loan.signature_scheme_requested ?? 'UKEP_ONLY';
  const schemeLabel = getSignatureSchemeLabel(loan.signature_scheme_requested ?? 'UKEP_ONLY');
  const nowIso = new Date().toISOString();

  // Pre-render REPEAT blocks as inline text (template engine will substitute)
  // For MVP, we render inline; the [[REPEAT:...]] blocks in the template will be
  // replaced by the render_block approach until the repeater engine is implemented.
  const lenderDisbursementBankRows = renderApp1BankRows(bankDetails, 'disbursement', 'lender');
  const borrowerDisbursementBankRows = renderApp1BankRows(bankDetails, 'disbursement', 'borrower');
  const lenderRepaymentBankRows = renderApp1BankRows(bankDetails, 'repayment', 'lender');

  return applyAliases({
    // Header metadata
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_DATE: formatDateRu(loan.issue_date || loan.created_at),
    APP1_VERSION_NO: '1',
    APP1_DOCUMENT_DATE: formatDateRu(nowIso),
    SIGNATURE_SCHEME_LABEL: schemeLabel,
    SIGNATURE_SCHEME_EFFECTIVE: schemeEffective,
    APP1_PREVIOUS_VERSION_REF: '',
    APP1_EFFECTIVE_AT: formatDateTimeRu(nowIso),

    // Parties
    LENDER_FULL_NAME: lenderProfile.full_name,
    BORROWER_FULL_NAME: borrowerProfile.full_name,

    // Policies
    BORROWER_DISBURSEMENT_RECEIPT_POLICY_LABEL: RECEIPT_POLICY_LABELS[loan.borrower_disbursement_receipt_policy] || loan.borrower_disbursement_receipt_policy,
    LENDER_REPAYMENT_RECEIPT_POLICY_LABEL: RECEIPT_POLICY_LABELS[loan.lender_repayment_receipt_policy] || loan.lender_repayment_receipt_policy,
    BORROWER_DISBURSEMENT_RECEIPT_POLICY: loan.borrower_disbursement_receipt_policy,
    LENDER_REPAYMENT_RECEIPT_POLICY: loan.lender_repayment_receipt_policy,

    // Row-level bank fields (pre-rendered for REPEAT blocks)
    // These become render_block content that replaces [[REPEAT:...]]...[[END_REPEAT]]
    LENDER_DISBURSEMENT_BANK_SOURCE_ROWS: lenderDisbursementBankRows,
    BORROWER_DISBURSEMENT_BANK_RECEIPT_ROWS: borrowerDisbursementBankRows,
    BORROWER_DISBURSEMENT_SBP_RECEIPT_ROUTE_ROWS: '[СБП-маршруты не указаны]',
    LENDER_REPAYMENT_BANK_RECEIPT_ROWS: lenderRepaymentBankRows,
    LENDER_REPAYMENT_SBP_RECEIPT_ROUTE_ROWS: '[СБП-маршруты не указаны]',

    // Changes summary (empty for initial version)
    APP1_CHANGES_SUMMARY_ROWS: '',

    // Signature
    APPENDIX_6_REFERENCE: isAppendix6Required(loan.signature_scheme_requested ?? 'UKEP_ONLY')
      ? 'Приложение № 6 (Соглашение об использовании УНЭП)'
      : '',
    APP1_SIGNED_BY_LENDER_AT: lenderSig ? formatDateTimeRu(lenderSig.signed_at) : '[ожидается подписание]',
    APP1_SIGNED_BY_BORROWER_AT: borrowerSig ? formatDateTimeRu(borrowerSig.signed_at) : '[ожидается подписание]',
  });
}

/**
 * Resolve variables for Appendix 2 — repayment schedule.
 * Source-aligned with Shablon_APP2_grafik_platezhey_v1_1_rus_clean.docx
 */
export async function resolveAppendixScheduleVariables(loanId: string): Promise<VariableRecord> {
  const [loanRes, scheduleRes, snapshotsRes, sigRes, debtSummary] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('payment_schedule_items').select('*').eq('loan_id', loanId).order('item_number'),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('loan_signatures').select('*').eq('loan_id', loanId),
    calculateDebtSummary(loanId),
  ]);

  const loan = loanRes.data;
  if (!loan) throw new Error('Loan not found');

  const snapshots = snapshotsRes.data || [];
  const signatures = sigRes.data || [];
  const scheduleItems = scheduleRes.data || [];
  if (scheduleItems.length === 0) {
    throw new Error('График платежей не сформирован. Создайте записи графика перед генерацией Приложения 2.');
  }

  const lenderProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'lender');
  const borrowerProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'borrower');
  if (!lenderProfileSnap || !borrowerProfileSnap) {
    throw new Error('Снимки профилей сторон не найдены.');
  }
  const lenderProfile = safeJsonCast<ProfileSnapshot>(lenderProfileSnap.snapshot_data);
  const borrowerProfile = safeJsonCast<ProfileSnapshot>(borrowerProfileSnap.snapshot_data);

  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');

  const nowIso = new Date().toISOString();
  const schemeLabel = getSignatureSchemeLabel(loan.signature_scheme_requested ?? 'UKEP_ONLY');

  // Determine edition kind: if both signatures exist, INITIAL_SIGNED, otherwise CURRENT_DERIVED
  const hasLenderSig = !!lenderSig;
  const hasBorrowerSig = !!borrowerSig;
  const editionKind = (hasLenderSig && hasBorrowerSig) ? 'INITIAL_SIGNED' : 'CURRENT_DERIVED';

  // Build schedule rows (pre-rendered for [[REPEAT:APP2_SCHEDULE_ROWS]])
  const scheduleRowsRendered = scheduleItems.map((item, idx) => {
    return `| ${idx + 1} | CONTRACTUAL_PLANNED | ${formatDateRu(item.due_date)} | — | 0 | ${fmtMoney(Number(item.interest_amount))} | ${fmtMoney(Number(item.principal_amount))} | 0 | ${fmtMoney(Number(item.total_amount))} | — | ${item.status} |`;
  }).join('\n');

  // Find next due item
  const today = new Date().toISOString().slice(0, 10);
  const nextDue = scheduleItems.find(i => i.due_date >= today && i.status === 'pending');
  const nextDueSummary = nextDue
    ? `Платёж № ${nextDue.item_number}, дата: ${formatDateRu(nextDue.due_date)}, сумма: ${fmtMoney(Number(nextDue.total_amount))} ${PLATFORM_CONFIG.LOAN_CURRENCY}`
    : 'Ближайший платёж отсутствует';

  return applyAliases({
    // Header metadata
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_DATE: formatDateRu(loan.issue_date || loan.created_at),
    APP2_VERSION_NO: '1',
    APP2_DOCUMENT_DATE: formatDateRu(nowIso),
    APP2_EDITION_KIND: editionKind,
    APP2_EDITION_KIND_LABEL: EDITION_KIND_LABELS[editionKind] || editionKind,
    APP2_GENERATION_SOURCE_LABEL: 'Автоматически из условий Договора',
    SIGNATURE_SCHEME_LABEL: schemeLabel,
    REPAYMENT_SCHEDULE_TYPE_LABEL: SCHEDULE_TYPE_LABELS[loan.repayment_schedule_type] || loan.repayment_schedule_type,
    APP2_CALCULATED_AT: formatDateTimeRu(nowIso),
    APP2_RECALC_RESULT_LABEL: 'Первоначальный расчет',
    APP2_CURRENT_STATUS_LABEL: editionKind === 'INITIAL_SIGNED' ? 'Подписанная' : 'Расчетная',
    APP2_WARNING_LEVEL_LABEL: 'Нет предупреждений',
    APP2_BASE_CONTRACT_VIEW_REF: `Версия сделки ${loan.deal_version}`,
    APP2_SOURCE_SET_HASH: '[MVP: not computed]',
    APP2_TRIGGER_REFERENCE: 'Первоначальное формирование',
    APP2_CONTEXT_APP1_REFS: 'Приложение № 1 (текущая редакция)',

    // Summary section 1
    CONFIRMED_TRANCHE_TOTAL: fmtMoney(debtSummary.totalDisbursed),
    CONFIRMED_REPAYMENT_TOTAL: fmtMoney(debtSummary.totalRepaid),
    OUTSTANDING_PRINCIPAL: fmtMoney(debtSummary.outstandingPrincipal),
    OUTSTANDING_LOAN_INTEREST: fmtMoney(debtSummary.outstandingInterest),
    OUTSTANDING_395_INTEREST: fmtMoney(debtSummary.outstanding395Interest),
    OUTSTANDING_CREDITOR_COSTS: fmtMoney(debtSummary.outstandingCosts),
    CONTRACTUAL_FINAL_DEADLINE: formatDateRu(loan.repayment_date),
    PROJECTED_PAYOFF_DATE: formatDateRu(loan.repayment_date),
    NEXT_DUE_ROW_SUMMARY: nextDueSummary,

    // Row-level repeater (pre-rendered)
    APP2_SCHEDULE_ROWS_RENDERED: scheduleRowsRendered,

    // Signature
    LENDER_FULL_NAME: lenderProfile.full_name,
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    APP2_LENDER_SIGNED_AT: lenderSig ? formatDateTimeRu(lenderSig.signed_at) : '[ожидается подписание]',
    APP2_BORROWER_SIGNED_AT: borrowerSig ? formatDateTimeRu(borrowerSig.signed_at) : '[ожидается подписание]',
  });
}

/**
 * Resolve variables for partial repayment confirmation (APP4).
 * Source-aligned with Shablon_APP4_podtverzhdenie_chastichnogo_ispolneniya_v1_0.docx
 */
export async function resolvePartialRepaymentVariables(
  loanId: string,
  paymentId: string
): Promise<VariableRecord> {
  const [loanRes, paymentRes, snapshotsRes, scheduleRes, debtSummary, existingApp4Res, sigPkgRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('loan_payments').select('*').eq('id', paymentId).single(),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('payment_schedule_items').select('*').eq('loan_id', loanId).order('item_number'),
    calculateDebtSummary(loanId),
    supabase.from('generated_documents').select('id').eq('loan_id', loanId).eq('document_type', 'partial_repayment_confirmation'),
    supabase.from('signature_packages').select('*').eq('loan_id', loanId).single(),
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

  const paymentAmount = Number(payment.transfer_amount);
  const remaining = debtSummary.outstandingPrincipal;
  const totalRemaining = remaining + debtSummary.outstandingInterest + debtSummary.outstanding395Interest + debtSummary.outstandingCosts;

  const scheduleItems = scheduleRes.data || [];
  const hasSchedule = scheduleItems.length > 0;
  const methodKey = payment.transfer_method === 'sbp' ? 'SBP' : 'BANK_TRANSFER';

  const existingApp4Count = existingApp4Res.data?.length ?? 0;
  const serialNo = existingApp4Count + 1;
  const nowIso = new Date().toISOString();

  const sigPkg = sigPkgRes.data;
  const schemeEffective = sigPkg?.signature_scheme_effective ?? loan.signature_scheme_requested ?? 'UKEP_ONLY';
  const schemeLabel = getSignatureSchemeLabel(loan.signature_scheme_requested ?? 'UKEP_ONLY');

  return applyAliases({
    // Header metadata
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_DATE: formatDateRu(loan.issue_date || loan.created_at),
    APP4_SERIAL_NO: String(serialNo),
    APP4_DOCUMENT_DATE: formatDateRu(nowIso),
    SIGNATURE_SCHEME_LABEL: schemeLabel,
    SIGNATURE_SCHEME_EFFECTIVE: schemeEffective,
    REPAYMENT_ID: payment.id,
    REPAYMENT_DATE: formatDateRu(payment.transfer_date),
    REPAYMENT_TIME: payment.confirmed_at ? new Date(payment.confirmed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—',
    REPAYMENT_AMOUNT: fmtMoney(paymentAmount),
    REPAYMENT_AMOUNT_IN_WORDS: amountToWordsRu(paymentAmount),
    LOAN_CURRENCY: PLATFORM_CONFIG.LOAN_CURRENCY,
    REPAYMENT_METHOD: methodKey,
    REPAYMENT_METHOD_LABEL: REPAYMENT_METHOD_LABELS[methodKey] || methodKey,
    REPAYMENT_BANK_DOCUMENT_ID: payment.transaction_id?.trim() || '[не указано]',
    APP1_EFFECTIVE_DOCUMENT_ID: 'Приложение № 1 (текущая редакция)',

    // Parties
    LENDER_FULL_NAME: lenderProfile.full_name,
    BORROWER_FULL_NAME: borrowerProfile.full_name,

    // Method-specific payment details (bank)
    REPAYMENT_RECEIVER_BANK_ACCOUNT_DISPLAY: '[реквизит Займодавца из APP1]',
    REPAYMENT_RECEIVER_BANK_NAME: payment.bank_name?.trim() || '[не указано]',
    REPAYMENT_RECEIVER_BANK_REQUISITE_DETAILS: '[см. Приложение № 1]',

    // Method-specific payment details (SBP)
    REPAYMENT_RECEIVER_SBP_ID: '[не указано]',
    REPAYMENT_RECEIVER_SBP_BANK: '[не указано]',
    REPAYMENT_RECEIVER_SBP_INSTRUCTION: '[не указано]',

    // Reference text
    REPAYMENT_REFERENCE_TEXT: payment.payment_reference?.trim() || `Возврат по договору займа № ${loan.contract_number || loan.id.slice(0, 8).toUpperCase()}`,

    // Allocation table — MVP: full payment allocated to principal
    APP4_ALLOCATION_TO_COSTS: '0',
    APP4_ALLOCATION_TO_INTEREST: '0',
    APP4_ALLOCATION_TO_PRINCIPAL: fmtMoney(paymentAmount),
    APP4_ALLOCATION_TO_395: '0',

    // Remaining obligation
    APP4_REMAINING_PRINCIPAL_AFTER: fmtMoney(remaining),
    APP4_TOTAL_REMAINING_OBLIGATION_AFTER: fmtMoney(totalRemaining),

    // APP2 linkage
    APP2_APPLIES: hasSchedule ? 'true' : 'false',
    APP2_LINKED_DOCUMENT_ID: hasSchedule ? 'Приложение № 2 (текущая расчетная редакция)' : '',
    APP2_RECALC_ACTION_LABEL: hasSchedule ? 'Актуализация по подтвержденному возврату' : '',

    // Request ID conditional
    APP4_REQUEST_ID_EXISTS: 'false',
    APP4_REQUEST_ID: '',

    // Signature
    APPENDIX_6_REFERENCE: isAppendix6Required(loan.signature_scheme_requested ?? 'UKEP_ONLY')
      ? 'Приложение № 6 (Соглашение об использовании УНЭП)'
      : '',
    APP4_SIGNED_AT: payment.confirmed_at ? formatDateTimeRu(payment.confirmed_at) : formatDateTimeRu(nowIso),
  });
}

/**
 * Resolve variables for full repayment confirmation (APP5).
 * Source-aligned with Shablon_APP5_podtverzhdenie_polnogo_ispolneniya_v1_0.docx
 */
export async function resolveFullRepaymentVariables(loanId: string): Promise<VariableRecord> {
  const [loanRes, tranchesRes, paymentsRes, snapshotsRes, scheduleRes, existingApp5Res, sigPkgRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('loan_tranches').select('*').eq('loan_id', loanId).eq('status', 'confirmed'),
    supabase.from('loan_payments').select('*').eq('loan_id', loanId).eq('status', 'confirmed').order('transfer_date', { ascending: false }),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('payment_schedule_items').select('*').eq('loan_id', loanId).order('item_number'),
    supabase.from('generated_documents').select('id').eq('loan_id', loanId).eq('document_type', 'full_repayment_confirmation'),
    supabase.from('signature_packages').select('*').eq('loan_id', loanId).single(),
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

  const closingPayment = confirmedPayments[0];
  const scheduleItems = scheduleRes.data || [];
  const hasSchedule = scheduleItems.length > 0;
  const closingAmount = closingPayment ? Number(closingPayment.transfer_amount) : 0;
  const closingMethodKey = closingPayment?.transfer_method === 'sbp' ? 'SBP' : 'BANK_TRANSFER';

  const existingApp5Count = existingApp5Res.data?.length ?? 0;
  const serialNo = existingApp5Count + 1;
  const nowIso = new Date().toISOString();

  const sigPkg = sigPkgRes.data;
  const schemeEffective = sigPkg?.signature_scheme_effective ?? loan.signature_scheme_requested ?? 'UKEP_ONLY';
  const schemeLabel = getSignatureSchemeLabel(loan.signature_scheme_requested ?? 'UKEP_ONLY');

  return applyAliases({
    // Header metadata
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_DATE: formatDateRu(loan.issue_date || loan.created_at),
    APP5_SERIAL_NO: String(serialNo),
    APP5_DOCUMENT_DATE: formatDateRu(nowIso),
    SIGNATURE_SCHEME_LABEL: schemeLabel,
    SIGNATURE_SCHEME_EFFECTIVE: schemeEffective,
    CLOSING_REPAYMENT_ID: closingPayment?.id || '',
    CLOSING_REPAYMENT_DATE: closingPayment ? formatDateRu(closingPayment.transfer_date) : '___________',
    CLOSING_REPAYMENT_TIME: closingPayment?.confirmed_at
      ? new Date(closingPayment.confirmed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : '—',
    CLOSING_REPAYMENT_AMOUNT: fmtMoney(closingAmount),
    CLOSING_REPAYMENT_AMOUNT_IN_WORDS: amountToWordsRu(closingAmount),
    LOAN_CURRENCY: PLATFORM_CONFIG.LOAN_CURRENCY,
    CLOSING_REPAYMENT_METHOD: closingMethodKey,
    CLOSING_REPAYMENT_METHOD_LABEL: REPAYMENT_METHOD_LABELS[closingMethodKey] || closingMethodKey,
    CLOSING_REPAYMENT_BANK_DOCUMENT_ID: closingPayment?.transaction_id?.trim() || '[не указано]',
    APP1_EFFECTIVE_DOCUMENT_ID: 'Приложение № 1 (текущая редакция)',
    DEAL_CLOSED_AT: formatDateTimeRu(nowIso),

    // Parties
    LENDER_FULL_NAME: lenderProfile.full_name,
    BORROWER_FULL_NAME: borrowerProfile.full_name,

    // Method-specific payment details (bank)
    CLOSING_REPAYMENT_RECEIVER_BANK_ACCOUNT_DISPLAY: '[реквизит Займодавца из APP1]',
    CLOSING_REPAYMENT_RECEIVER_BANK_NAME: closingPayment?.bank_name?.trim() || '[не указано]',
    CLOSING_REPAYMENT_RECEIVER_BANK_REQUISITE_DETAILS: '[см. Приложение № 1]',

    // Method-specific payment details (SBP)
    CLOSING_REPAYMENT_RECEIVER_SBP_ID: '[не указано]',
    CLOSING_REPAYMENT_RECEIVER_SBP_BANK: '[не указано]',
    CLOSING_REPAYMENT_RECEIVER_SBP_INSTRUCTION: '[не указано]',

    // Reference text
    CLOSING_REPAYMENT_REFERENCE_TEXT: closingPayment?.payment_reference?.trim() || `Возврат по договору займа № ${loan.contract_number || loan.id.slice(0, 8).toUpperCase()}`,

    // Allocation table — MVP: full closing payment allocated to principal
    APP5_ALLOCATION_TO_COSTS: '0',
    APP5_ALLOCATION_TO_INTEREST: '0',
    APP5_ALLOCATION_TO_PRINCIPAL: fmtMoney(closingAmount),
    APP5_ALLOCATION_TO_395: '0',

    // Full performance summary
    APP5_TOTAL_DISBURSED: fmtMoney(totalDisbursed),
    APP5_TOTAL_REPAID_CONFIRMED: fmtMoney(totalRepaid),
    APP5_TOTAL_ALLOCATED_TO_COSTS: '0',
    APP5_TOTAL_ALLOCATED_TO_INTEREST: '0',
    APP5_TOTAL_ALLOCATED_TO_PRINCIPAL: fmtMoney(totalDisbursed),
    APP5_TOTAL_ALLOCATED_TO_395: '0',

    // Zero balance / CLOSED
    APP5_REMAINING_PRINCIPAL_AFTER: '0',
    APP5_TOTAL_REMAINING_OBLIGATION_AFTER: '0',

    // APP2 linkage
    APP2_APPLIES: hasSchedule ? 'true' : 'false',
    APP2_LINKED_DOCUMENT_ID: hasSchedule ? 'Приложение № 2 (итоговая расчетная редакция)' : '',
    APP2_CLOSEOUT_STATUS: hasSchedule ? 'CLOSEOUT_DERIVED' : '',

    // Request / supersedes conditionals
    APP5_REQUEST_ID_EXISTS: 'false',
    APP5_REQUEST_ID: '',
    APP5_SUPERSEDES_ID_EXISTS: 'false',
    APP5_SUPERSEDES_ID: '',

    // Signature
    APPENDIX_6_REFERENCE: isAppendix6Required(loan.signature_scheme_requested ?? 'UKEP_ONLY')
      ? 'Приложение № 6 (Соглашение об использовании УНЭП)'
      : '',
    APP5_SIGNED_AT: formatDateTimeRu(nowIso),
  });
}

/**
 * Resolve variables for EDO Regulation document.
 */
export async function resolveEdoRegulationVariables(): Promise<VariableRecord> {
  const regulation = await getCurrentRegulation();

  if (!regulation) {
    throw new Error('Регламент ЭДО не опубликован.');
  }

  return applyAliases({
    EDO_REGULATION_NAME: regulation.title,
    EDO_REGULATION_VERSION: regulation.version,
    EDO_REGULATION_ID: regulation.id,
    EDO_REGULATION_EFFECTIVE_FROM: formatDateRu(regulation.effective_from),
    PLATFORM_NAME: PLATFORM_CONFIG.PLATFORM_NAME,
    PLATFORM_BRAND_NAME: PLATFORM_CONFIG.PLATFORM_BRAND_NAME,
    PLATFORM_URL: PLATFORM_CONFIG.PLATFORM_URL,
    PLATFORM_OPERATOR_NAME: PLATFORM_CONFIG.PLATFORM_OPERATOR_NAME,
    PLATFORM_OPERATOR_LEGAL_DETAILS: PLATFORM_CONFIG.PLATFORM_OPERATOR_LEGAL_DETAILS,
    SUPPORT_CONTACTS_TEXT: PLATFORM_CONFIG.SUPPORT_CONTACTS_TEXT,
  });
}

/**
 * Resolve variables for APP6 (UNEP Agreement).
 */
export async function resolveApp6Variables(loanId: string): Promise<VariableRecord> {
  const [loanRes, regulation, snapshotsRes, unepRes, sigRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    getCurrentRegulation(),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('unep_agreements').select('*').eq('loan_id', loanId).single(),
    supabase.from('loan_signatures').select('*').eq('loan_id', loanId),
  ]);

  const loan = loanRes.data;
  if (!loan) throw new Error('Loan not found');

  const snapshots = snapshotsRes.data || [];
  const lenderSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'lender');
  const borrowerSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'borrower');
  if (!lenderSnap || !borrowerSnap) throw new Error('Снимки профилей сторон не найдены.');

  const lenderProfile = safeJsonCast<ProfileSnapshot>(lenderSnap.snapshot_data);
  const borrowerProfile = safeJsonCast<ProfileSnapshot>(borrowerSnap.snapshot_data);

  const signatures = sigRes.data || [];
  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');
  const lastSignatureAt = signatures.length > 0
    ? signatures.reduce((latest, s) => s.signed_at > latest ? s.signed_at : latest, signatures[0].signed_at)
    : null;

  const unep = unepRes.data;
  const schemeRequested = (loan as any).signature_scheme_requested ?? 'UKEP_ONLY';

  return applyAliases({
    // Contract / deal references
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_PLACE: loan.city,
    CONTRACT_DATE: formatDateRu(loan.issue_date || loan.created_at),
    DEAL_ID: loan.id,
    LAST_SIGNATURE_AT: lastSignatureAt ? formatDateTimeRu(lastSignatureAt) : '[ожидается подписание]',

    // Party data
    LENDER_FULL_NAME: lenderProfile.full_name,
    LENDER_APP_ACCOUNT_ID: lenderProfile.user_id,
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    BORROWER_APP_ACCOUNT_ID: borrowerProfile.user_id,

    // Platform
    PLATFORM_NAME: PLATFORM_CONFIG.PLATFORM_NAME,
    PLATFORM_BRAND_NAME: PLATFORM_CONFIG.PLATFORM_BRAND_NAME,
    PLATFORM_URL: PLATFORM_CONFIG.PLATFORM_URL,
    PLATFORM_OPERATOR_NAME: PLATFORM_CONFIG.PLATFORM_OPERATOR_NAME,
    SUPPORT_CONTACTS_TEXT: PLATFORM_CONFIG.SUPPORT_CONTACTS_TEXT,

    // EDO regulation
    EDO_REGULATION_NAME: regulation?.title ?? '[не опубликован]',
    EDO_REGULATION_VERSION: regulation?.version ?? '[не опубликован]',
    EDO_REGULATION_EFFECTIVE_FROM: regulation ? formatDateRu(regulation.effective_from) : '[не опубликован]',

    // Signature scheme
    SIGNATURE_SCHEME_REQUESTED: schemeRequested,
    SIGNATURE_SCHEME_LABEL: getSignatureSchemeLabel(schemeRequested),
    APPENDIX_6_REQUIRED: isAppendix6Required(schemeRequested) ? 'YES' : 'NO',
    APPENDIX_6_STATUS: unep?.status ?? 'pending',

    // APP6-specific fields
    APP6_CREATED_AT: unep ? formatDateTimeRu(unep.created_at) : formatDateTimeRu(new Date().toISOString()),
    APP6_SCOPE_TEXT: 'Настоящее Соглашение распространяется на все электронные документы, формируемые и подписываемые Сторонами в рамках Договора денежного займа, указанного в заголовке настоящего Соглашения, посредством Платформы.',
    APP6_COVERED_DOCUMENTS_TEXT: 'Договор денежного займа, Приложения к Договору, Расписки о получении траншей, Подтверждения частичного и полного погашения, а также иные документы, предусмотренные Договором.',
    APP6_SIGNED_BY_LENDER_AT: unep?.lender_signed_at ? formatDateTimeRu(unep.lender_signed_at) : '[ожидается подписание]',
    APP6_SIGNED_BY_BORROWER_AT: unep?.borrower_signed_at ? formatDateTimeRu(unep.borrower_signed_at) : '[ожидается подписание]',

    // Signature blocks
    LENDER_SIGNATURE_BLOCK: renderSignatureBlock(lenderSig, 'lender'),
    BORROWER_SIGNATURE_BLOCK: renderSignatureBlock(borrowerSig, 'borrower'),
  });
}
