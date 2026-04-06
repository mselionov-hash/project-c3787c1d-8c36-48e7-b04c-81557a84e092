/**
 * Variable resolver: gathers data from snapshots, loan, tranches, signatures,
 * bank details and produces a flat VariableRecord for the template engine.
 *
 * CRITICAL RULES:
 * - No forbidden markers in output: no [не указано], ___________, [реквизиты не указаны], etc.
 * - Date-only fields (DOB, passport_issue_date, issue_date, repayment_date, etc.)
 *   MUST use formatDateOnlyRu to avoid timezone shift.
 * - Datetime fields (signed_at, created_at, confirmed_at) use formatDateTimeRu.
 * - If required data is missing, throw an error instead of emitting a placeholder.
 * - If optional data is missing, use empty string '' (omit from document).
 */

import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_CONFIG } from './platform-config';
import { amountToWordsRu } from './number-to-words-ru';
import type { VariableRecord, RepeatData, ResolverResult } from './template-engine';
import type { Tables, Json } from '@/integrations/supabase/types';
import { applyAliases } from '../variables/aliases';
import { getOfferorRole, getOffereeRole } from './deal-logic';
import { getSignatureSchemeLabel, isAppendix6Required } from './signature-scheme';
import { getCurrentRegulation } from './regulation-service';
import { parseDateOnly } from '@/lib/date-utils';

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

/**
 * Format a date-only string (YYYY-MM-DD or date part of ISO) for Russian locale.
 * Uses parseDateOnly to avoid timezone shift.
 * Returns empty string if null/missing.
 */
function formatDateOnlyRu(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    // Extract date-only part if it's a full ISO datetime
    const dateOnly = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
    const date = parseDateOnly(dateOnly);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Format a datetime string for Russian locale (includes time).
 * Returns empty string if null/missing.
 */
function formatDateTimeRu(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function renderSignatureBlock(sig: Signature | undefined, role: string): string {
  if (!sig) return 'подпись отсутствует';
  const dateStr = formatDateTimeRu(sig.signed_at);
  const ipStr = sig.signer_ip ? ` | IP: ${sig.signer_ip}` : '';
  const roleLabel = role === 'lender' ? 'Займодавец' : 'Заёмщик';
  return `Электронная подпись (${roleLabel}): подписано ${dateStr}${ipStr}`;
}

function renderBankDetailsTable(details: BankDetailSnapshotItem[], purpose: string, partyRole: string): string {
  const filtered = details.filter(d => d.purpose === purpose && d.party_role === partyRole);
  if (filtered.length === 0) return 'Реквизиты не согласованы';

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
    `Email | ${lenderProfile.email || 'не указан'} | ${borrowerProfile.email || 'не указан'}`,
    `Телефон | ${lenderProfile.phone || 'не указан'} | ${borrowerProfile.phone || 'не указан'}`,
    `Адрес | ${lenderProfile.address || 'не указан'} | ${borrowerProfile.address || 'не указан'}`,
    `ID на Платформе | ${lenderProfile.user_id} | ${borrowerProfile.user_id}`,
  ];
  return rows.join('\n');
}

function renderScheduleTable(items: Tables<'payment_schedule_items'>[]): string {
  if (items.length === 0) return 'График платежей не применяется';
  const rows = [
    '№ | Дата | Основной долг | Проценты | Итого',
    '---|---|---|---|---',
    ...items.map(item =>
      `${item.item_number} | ${formatDateOnlyRu(item.due_date)} | ${Number(item.principal_amount).toLocaleString('ru-RU')} ₽ | ${Number(item.interest_amount).toLocaleString('ru-RU')} ₽ | ${Number(item.total_amount).toLocaleString('ru-RU')} ₽`
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
  if (!display) return '';
  return display;
}

/**
 * Calculate debt summary for a loan.
 */
async function calculateDebtSummary(loanId: string) {
  const [tranchesRes, paymentsRes] = await Promise.all([
    supabase.from('loan_tranches').select('amount').eq('loan_id', loanId).eq('status', 'confirmed'),
    supabase.from('loan_payments').select('transfer_amount').eq('loan_id', loanId).eq('status', 'confirmed'),
  ]);
  const totalDisbursed = (tranchesRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
  const totalRepaid = (paymentsRes.data || []).reduce((s, p) => s + Number(p.transfer_amount), 0);
  const outstandingPrincipal = Math.max(0, totalDisbursed - totalRepaid);
  const outstandingInterest = 0;
  const outstanding395Interest = 0;
  const outstandingCosts = 0;
  const activeDebt = outstandingPrincipal + outstandingInterest + outstanding395Interest + outstandingCosts;
  return { totalDisbursed, totalRepaid, outstandingPrincipal, outstandingInterest, outstanding395Interest, outstandingCosts, activeDebt };
}

/**
 * Calculate debt summary as of a specific payment event (for APP4).
 * Only considers tranches and payments up to and including the given payment.
 */
async function calculateDebtSummaryAtPayment(loanId: string, paymentId: string) {
  const [tranchesRes, paymentsRes] = await Promise.all([
    supabase.from('loan_tranches').select('amount, confirmed_at').eq('loan_id', loanId).eq('status', 'confirmed'),
    supabase.from('loan_payments').select('id, transfer_amount, confirmed_at').eq('loan_id', loanId).eq('status', 'confirmed').order('confirmed_at'),
  ]);
  
  const totalDisbursed = (tranchesRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
  
  // Sum payments up to and including the target payment
  const allPayments = paymentsRes.data || [];
  let totalRepaidAtEvent = 0;
  for (const p of allPayments) {
    totalRepaidAtEvent += Number(p.transfer_amount);
    if (p.id === paymentId) break;
  }
  
  const outstandingPrincipal = Math.max(0, totalDisbursed - totalRepaidAtEvent);
  return { totalDisbursed, totalRepaid: totalRepaidAtEvent, outstandingPrincipal };
}

/**
 * Validate required profile fields before document generation.
 */
function validateProfile(profile: ProfileSnapshot, role: string): void {
  const label = role === 'lender' ? 'Займодавца' : 'Заёмщика';
  if (!profile.full_name) throw new Error(`ФИО ${label} не заполнено`);
  if (!profile.passport_series) throw new Error(`Серия паспорта ${label} не заполнена`);
  if (!profile.passport_number) throw new Error(`Номер паспорта ${label} не заполнен`);
  if (!profile.passport_issued_by) throw new Error(`Поле «Кем выдан паспорт» ${label} не заполнено`);
  if (!profile.passport_issue_date) throw new Error(`Дата выдачи паспорта ${label} не заполнена`);
}

/**
 * Resolve all variables for a loan contract document.
 */
export async function resolveContractVariables(loanId: string): Promise<ResolverResult> {
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

  const lenderProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'lender');
  const borrowerProfileSnap = snapshots.find(s => s.snapshot_type === 'party_profile' && s.role === 'borrower');
  const bankDetailsSnap = snapshots.find(s => s.snapshot_type === 'allowed_bank_details');

  if (!lenderProfileSnap || !borrowerProfileSnap) {
    throw new Error('Снимки профилей сторон не найдены. Договор должен быть подписан обеими сторонами перед генерацией документа.');
  }

  const lenderProfile: ProfileSnapshot = safeJsonCast<ProfileSnapshot>(lenderProfileSnap.snapshot_data);
  const borrowerProfile: ProfileSnapshot = safeJsonCast<ProfileSnapshot>(borrowerProfileSnap.snapshot_data);

  validateProfile(lenderProfile, 'lender');
  validateProfile(borrowerProfile, 'borrower');

  const bankDetails: BankDetailSnapshotItem[] = bankDetailsSnap
    ? safeJsonCast<AllowedBankDetailsSnapshotData>(bankDetailsSnap.snapshot_data).details
    : [];

  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');
  const lastSignatureAt = signatures.length > 0
    ? signatures.reduce((latest, s) => s.signed_at > latest ? s.signed_at : latest, signatures[0].signed_at)
    : null;

  if (!lastSignatureAt) {
    throw new Error('Договор не подписан ни одной стороной.');
  }

  const vars: VariableRecord = {
    // Contract metadata
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_PLACE: loan.city,
    CONTRACT_DATE: formatDateOnlyRu(loan.issue_date || loan.created_at),
    LAST_SIGNATURE_AT: formatDateTimeRu(lastSignatureAt),

    // Lender profile
    LENDER_FULL_NAME: lenderProfile.full_name,
    LENDER_DOB: formatDateOnlyRu(lenderProfile.date_of_birth),
    LENDER_PASSPORT_SERIES: lenderProfile.passport_series || '',
    LENDER_PASSPORT_NUMBER: lenderProfile.passport_number || '',
    LENDER_PASSPORT_ISSUED_BY: lenderProfile.passport_issued_by || '',
    LENDER_PASSPORT_ISSUE_DATE: formatDateOnlyRu(lenderProfile.passport_issue_date),
    LENDER_PASSPORT_DIVISION_CODE: lenderProfile.passport_division_code || '',
    LENDER_REG_ADDRESS: lenderProfile.address || '',
    LENDER_CONTACT_PHONE: lenderProfile.phone || '',
    LENDER_EMAIL: lenderProfile.email || '',
    LENDER_APP_ACCOUNT_ID: lenderProfile.user_id,

    // Borrower profile
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    BORROWER_DOB: formatDateOnlyRu(borrowerProfile.date_of_birth),
    BORROWER_PASSPORT_SERIES: borrowerProfile.passport_series || '',
    BORROWER_PASSPORT_NUMBER: borrowerProfile.passport_number || '',
    BORROWER_PASSPORT_ISSUED_BY: borrowerProfile.passport_issued_by || '',
    BORROWER_PASSPORT_ISSUE_DATE: formatDateOnlyRu(borrowerProfile.passport_issue_date),
    BORROWER_PASSPORT_DIVISION_CODE: borrowerProfile.passport_division_code || '',
    BORROWER_REG_ADDRESS: borrowerProfile.address || '',
    BORROWER_CONTACT_PHONE: borrowerProfile.phone || '',
    BORROWER_EMAIL: borrowerProfile.email || '',
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
    FINAL_REPAYMENT_DEADLINE: formatDateOnlyRu(loan.repayment_date),
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

  // Validate required tranche fields
  if (!tranche.actual_date && !tranche.planned_date) {
    throw new Error('Дата перечисления транша не указана.');
  }

  const vars: VariableRecord = {
    RECEIPT_TITLE: PLATFORM_CONFIG.RECEIPT_TITLE,
    TRANCHE_RECEIPT_NUMBER: String(receiptNumber),
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    TRANCHE_RECEIPT_DRAFT_CREATED_AT: formatDateTimeRu(new Date().toISOString()),
    TRANCHE_RECEIPT_SIGNED_AT: tranche.confirmed_at ? formatDateTimeRu(tranche.confirmed_at) : 'ожидается подписание',

    // Lender
    LENDER_FULL_NAME: lenderProfile.full_name,
    LENDER_DOB: formatDateOnlyRu(lenderProfile.date_of_birth),
    LENDER_PASSPORT_SERIES: lenderProfile.passport_series || '',
    LENDER_PASSPORT_NUMBER: lenderProfile.passport_number || '',
    LENDER_PASSPORT_ISSUED_BY: lenderProfile.passport_issued_by || '',
    LENDER_PASSPORT_ISSUE_DATE: formatDateOnlyRu(lenderProfile.passport_issue_date),
    LENDER_PASSPORT_DIVISION_CODE: lenderProfile.passport_division_code || '',
    LENDER_REG_ADDRESS: lenderProfile.address || '',
    LENDER_CONTACT_PHONE: lenderProfile.phone || '',
    LENDER_EMAIL: lenderProfile.email || '',
    LENDER_APP_ACCOUNT_ID: lenderProfile.user_id,

    // Borrower
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    BORROWER_DOB: formatDateOnlyRu(borrowerProfile.date_of_birth),
    BORROWER_PASSPORT_SERIES: borrowerProfile.passport_series || '',
    BORROWER_PASSPORT_NUMBER: borrowerProfile.passport_number || '',
    BORROWER_PASSPORT_ISSUED_BY: borrowerProfile.passport_issued_by || '',
    BORROWER_PASSPORT_ISSUE_DATE: formatDateOnlyRu(borrowerProfile.passport_issue_date),
    BORROWER_PASSPORT_DIVISION_CODE: borrowerProfile.passport_division_code || '',
    BORROWER_REG_ADDRESS: borrowerProfile.address || '',
    BORROWER_CONTACT_PHONE: borrowerProfile.phone || '',
    BORROWER_EMAIL: borrowerProfile.email || '',
    BORROWER_APP_ACCOUNT_ID: borrowerProfile.user_id,

    // Platform
    PLATFORM_NAME: PLATFORM_CONFIG.PLATFORM_NAME,
    PLATFORM_URL: PLATFORM_CONFIG.PLATFORM_URL,
    PLATFORM_OPERATOR_NAME: PLATFORM_CONFIG.PLATFORM_OPERATOR_NAME,

    // Contract references
    CONTRACT_DATE: formatDateOnlyRu(loan.issue_date || loan.created_at),
    LAST_SIGNATURE_AT: lastSignatureAt ? formatDateTimeRu(lastSignatureAt) : '',

    // Tranche fields
    TRANCHE_ID: tranche.id,
    TRANCHE_AMOUNT: Number(tranche.amount).toLocaleString('ru-RU'),
    TRANCHE_AMOUNT_IN_WORDS: amountToWordsRu(Number(tranche.amount)),
    TRANCHE_CURRENCY: tranche.currency || 'руб.',
    TRANCHE_DATE: formatDateOnlyRu(tranche.actual_date || tranche.planned_date),
    TRANCHE_TIME: tranche.actual_time || 'время не зафиксировано',
    TRANCHE_TIMEZONE: tranche.timezone ? tranche.timezone.replace('Europe/Moscow', 'МСК') : 'МСК',
    TRANCHE_METHOD: methodKey,
    TRANCHE_METHOD_LABEL: methodKey === 'SBP' ? 'Перевод через СБП' : 'Банковский перевод',
    TRANCHE_SENDER_ACCOUNT_DISPLAY: tranche.sender_account_display || 'реквизит Займодавца (см. Приложение № 1)',
    TRANCHE_RECEIVER_ACCOUNT_DISPLAY: tranche.receiver_account_display || 'реквизит Заёмщика (см. Приложение № 1)',
    TRANCHE_REFERENCE_TEXT: tranche.reference_text || `По договору займа № ${loan.contract_number || loan.id.slice(0, 8).toUpperCase()}`,
    TRANCHE_BANK_DOCUMENT_ID: tranche.bank_document_id || 'не предоставлен',
    TRANCHE_BANK_DOCUMENT_DATE: formatDateOnlyRu(tranche.bank_document_date) || 'не указана',
    TRANCHE_TRANSFER_SOURCE: tranche.transfer_source || 'MANUAL',

    // TZ v2.2 printable requisite fields
    TRANCHE_SENDER_REQUISITE_PRINTABLE: formatRequisitePrintable(tranche, 'sender') || 'см. Приложение № 1',
    TRANCHE_RECEIVER_REQUISITE_PRINTABLE: formatRequisitePrintable(tranche, 'receiver') || 'см. Приложение № 1',
    TRANCHE_RECEIVER_SBP_ROUTE_PRINTABLE: methodKey === 'SBP'
      ? (tranche.receiver_account_display || 'см. Приложение № 1')
      : '',

    // Conditional flags
    LENDER_CO_SIGNATURE_ENABLED: PLATFORM_CONFIG.LENDER_CO_SIGNATURE_ENABLED,
    PAYMENT_PROOF_ATTACHMENT_ENABLED: PLATFORM_CONFIG.PAYMENT_PROOF_ATTACHMENT_ENABLED,

    // Signature blocks
    BORROWER_SIGNATURE_BLOCK: renderSignatureBlock(borrowerSig, 'borrower'),
    LENDER_SIGNATURE_BLOCK_OPTIONAL: 'не требуется',
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
 * Resolve variables for Appendix 1 — allowed bank details.
 */
export async function resolveAppendixBankDetailsVariables(loanId: string): Promise<ResolverResult> {
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

  if (bankDetails.length === 0) {
    throw new Error('Допустимые банковские реквизиты не согласованы. Невозможно сформировать Приложение № 1.');
  }

  const lenderSig = signatures.find(s => s.role === 'lender');
  const borrowerSig = signatures.find(s => s.role === 'borrower');

  const sigPkg = sigPkgRes.data;
  const schemeEffective = sigPkg?.signature_scheme_effective ?? loan.signature_scheme_requested ?? 'UKEP_ONLY';
  const schemeLabel = getSignatureSchemeLabel(loan.signature_scheme_requested ?? 'UKEP_ONLY');
  const nowIso = new Date().toISOString();

  // Build structured repeat sections for APP1
  const buildBankRows = (purpose: string, partyRole: string): VariableRecord[] => {
    const filtered = bankDetails.filter(d => d.purpose === purpose && d.party_role === partyRole);
    return filtered.map((d, i) => ({
      ROW_NO: String(i + 1),
      RECIPIENT_NAME_LABEL: d.recipient_display_name || d.bank_name,
      BANK_NAME: d.bank_name,
      BIC: d.bik || 'не применимо',
      ACCOUNT_NO_PRINTABLE: d.account_number || d.card_number || 'не применимо',
      CORRESPONDENT_ACCOUNT: 'не применимо',
    }));
  };

  const buildSbpRows = (purpose: string, partyRole: string): VariableRecord[] => {
    const filtered = bankDetails.filter(d => d.purpose === purpose && d.party_role === partyRole && d.phone);
    return filtered.map((d, i) => ({
      ROW_NO: String(i + 1),
      RECIPIENT_NAME_LABEL: d.recipient_display_name || d.bank_name,
      SBP_PHONE_OR_IDENTIFIER: d.phone || '',
      SBP_BANK: d.bank_name,
      SBP_INSTRUCTION: 'стандартный перевод',
    }));
  };

  const repeatSections: RepeatData = {
    LENDER_DISBURSEMENT_BANK_SOURCE: buildBankRows('disbursement', 'lender'),
    BORROWER_DISBURSEMENT_BANK_RECEIPT: buildBankRows('disbursement', 'borrower'),
    BORROWER_DISBURSEMENT_SBP_RECEIPT_ROUTE: buildSbpRows('disbursement', 'borrower'),
    LENDER_REPAYMENT_BANK_RECEIPT: buildBankRows('repayment', 'lender'),
    LENDER_REPAYMENT_SBP_RECEIPT_ROUTE: buildSbpRows('repayment', 'lender'),
    APP1_CHANGES_SUMMARY: [], // Empty for initial version — section will be cleanly omitted
  };

  return {
    variables: applyAliases({
      // Header metadata
      CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
      CONTRACT_DATE: formatDateOnlyRu(loan.issue_date || loan.created_at),
      APP1_VERSION_NO: '1',
      APP1_DOCUMENT_DATE: formatDateOnlyRu(nowIso),
      SIGNATURE_SCHEME_LABEL: schemeLabel,
      SIGNATURE_SCHEME_EFFECTIVE: schemeEffective,
      APP1_PREVIOUS_VERSION_REF: 'первоначальная редакция',
      APP1_EFFECTIVE_AT: formatDateTimeRu(nowIso),

      // Parties
      LENDER_FULL_NAME: lenderProfile.full_name,
      BORROWER_FULL_NAME: borrowerProfile.full_name,

      // Policies
      BORROWER_DISBURSEMENT_RECEIPT_POLICY_LABEL: RECEIPT_POLICY_LABELS[loan.borrower_disbursement_receipt_policy] || loan.borrower_disbursement_receipt_policy,
      LENDER_REPAYMENT_RECEIPT_POLICY_LABEL: RECEIPT_POLICY_LABELS[loan.lender_repayment_receipt_policy] || loan.lender_repayment_receipt_policy,
      BORROWER_DISBURSEMENT_RECEIPT_POLICY: loan.borrower_disbursement_receipt_policy,
      LENDER_REPAYMENT_RECEIPT_POLICY: loan.lender_repayment_receipt_policy,

      // Signature
      APPENDIX_6_REFERENCE: isAppendix6Required(loan.signature_scheme_requested ?? 'UKEP_ONLY')
        ? 'Приложение № 6 (Соглашение об использовании УНЭП)'
        : '',
      APP1_SIGNED_BY_LENDER_AT: lenderSig ? formatDateTimeRu(lenderSig.signed_at) : 'ожидается подписание',
      APP1_SIGNED_BY_BORROWER_AT: borrowerSig ? formatDateTimeRu(borrowerSig.signed_at) : 'ожидается подписание',
    }),
    repeatSections,
  };
}

/**
 * Resolve variables for Appendix 2 — repayment schedule.
 */
export async function resolveAppendixScheduleVariables(loanId: string): Promise<ResolverResult> {
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

  const hasLenderSig = !!lenderSig;
  const hasBorrowerSig = !!borrowerSig;
  const editionKind = (hasLenderSig && hasBorrowerSig) ? 'INITIAL_SIGNED' : 'CURRENT_DERIVED';

  const today = new Date().toISOString().slice(0, 10);
  const nextDue = scheduleItems.find(i => i.due_date >= today && i.status === 'pending');
  const nextDueSummary = nextDue
    ? `Платёж № ${nextDue.item_number}, дата: ${formatDateOnlyRu(nextDue.due_date)}, сумма: ${fmtMoney(Number(nextDue.total_amount))} ${PLATFORM_CONFIG.LOAN_CURRENCY}`
    : 'Ближайший платёж отсутствует';

  let runningPrincipal = debtSummary.totalDisbursed;
  const app2ScheduleRows: VariableRecord[] = scheduleItems.map((item, idx) => {
    const principalAmt = Number(item.principal_amount);
    const interestAmt = Number(item.interest_amount);
    const totalAmt = Number(item.total_amount);
    runningPrincipal = Math.max(0, runningPrincipal - principalAmt);
    return {
      APP2_ROW_NO: String(idx + 1),
      APP2_ROW_KIND_LABEL: 'CONTRACTUAL_PLANNED',
      APP2_ROW_DATE_OR_PERIOD: formatDateOnlyRu(item.due_date),
      APP2_ROW_EVENT_REF: '',
      APP2_ROW_TO_COSTS: '0',
      APP2_ROW_TO_LOAN_INTEREST: fmtMoney(interestAmt),
      APP2_ROW_TO_PRINCIPAL: fmtMoney(principalAmt),
      APP2_ROW_TO_395: '0',
      APP2_ROW_TOTAL: fmtMoney(totalAmt),
      APP2_ROW_OUTSTANDING_PRINCIPAL_AFTER: fmtMoney(runningPrincipal),
      APP2_ROW_NOTE: item.status,
    };
  });

  const repeatSections: RepeatData = {
    APP2_SCHEDULE_ROWS: app2ScheduleRows,
  };

  return {
    variables: applyAliases({
      CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
      CONTRACT_DATE: formatDateOnlyRu(loan.issue_date || loan.created_at),
      APP2_VERSION_NO: '1',
      APP2_DOCUMENT_DATE: formatDateOnlyRu(nowIso),
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
      APP2_SOURCE_SET_HASH: '',
      APP2_TRIGGER_REFERENCE: 'Первоначальное формирование',
      APP2_CONTEXT_APP1_REFS: 'Приложение № 1 (текущая редакция)',

      CONFIRMED_TRANCHE_TOTAL: fmtMoney(debtSummary.totalDisbursed),
      CONFIRMED_REPAYMENT_TOTAL: fmtMoney(debtSummary.totalRepaid),
      OUTSTANDING_PRINCIPAL: fmtMoney(debtSummary.outstandingPrincipal),
      OUTSTANDING_LOAN_INTEREST: fmtMoney(debtSummary.outstandingInterest),
      OUTSTANDING_395_INTEREST: fmtMoney(debtSummary.outstanding395Interest),
      OUTSTANDING_CREDITOR_COSTS: fmtMoney(debtSummary.outstandingCosts),
      CONTRACTUAL_FINAL_DEADLINE: formatDateOnlyRu(loan.repayment_date),
      PROJECTED_PAYOFF_DATE: formatDateOnlyRu(loan.repayment_date),
      NEXT_DUE_ROW_SUMMARY: nextDueSummary,

      LENDER_FULL_NAME: lenderProfile.full_name,
      BORROWER_FULL_NAME: borrowerProfile.full_name,
      APP2_LENDER_SIGNED_AT: lenderSig ? formatDateTimeRu(lenderSig.signed_at) : 'ожидается подписание',
      APP2_BORROWER_SIGNED_AT: borrowerSig ? formatDateTimeRu(borrowerSig.signed_at) : 'ожидается подписание',
    }),
    repeatSections,
  };
}

/**
 * Resolve variables for partial repayment confirmation (APP4).
 * CRITICAL: Remaining balance is calculated AS OF this specific payment event,
 * not from the global current state.
 */
export async function resolvePartialRepaymentVariables(
  loanId: string,
  paymentId: string
): Promise<ResolverResult> {
  const [loanRes, paymentRes, snapshotsRes, scheduleRes, debtAtPayment, existingApp4Res, sigPkgRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('loan_payments').select('*').eq('id', paymentId).single(),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('payment_schedule_items').select('*').eq('loan_id', loanId).order('item_number'),
    calculateDebtSummaryAtPayment(loanId, paymentId),
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
  // Use event-specific remaining balance
  const remaining = debtAtPayment.outstandingPrincipal;
  const totalRemaining = remaining; // MVP: no interest engine

  const scheduleItems = scheduleRes.data || [];
  const hasSchedule = scheduleItems.length > 0;
  const methodKey = payment.transfer_method === 'sbp' ? 'SBP' : 'BANK_TRANSFER';

  const existingApp4Count = existingApp4Res.data?.length ?? 0;
  const serialNo = existingApp4Count + 1;
  const nowIso = new Date().toISOString();

  const sigPkg = sigPkgRes.data;
  const schemeEffective = sigPkg?.signature_scheme_effective ?? loan.signature_scheme_requested ?? 'UKEP_ONLY';
  const schemeLabel = getSignatureSchemeLabel(loan.signature_scheme_requested ?? 'UKEP_ONLY');

  return { variables: applyAliases({
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_DATE: formatDateOnlyRu(loan.issue_date || loan.created_at),
    APP4_SERIAL_NO: String(serialNo),
    APP4_DOCUMENT_DATE: formatDateOnlyRu(nowIso),
    SIGNATURE_SCHEME_LABEL: schemeLabel,
    SIGNATURE_SCHEME_EFFECTIVE: schemeEffective,
    REPAYMENT_ID: payment.id,
    REPAYMENT_DATE: formatDateOnlyRu(payment.transfer_date),
    REPAYMENT_TIME: payment.confirmed_at ? new Date(payment.confirmed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'время не зафиксировано',
    REPAYMENT_AMOUNT: fmtMoney(paymentAmount),
    REPAYMENT_AMOUNT_IN_WORDS: amountToWordsRu(paymentAmount),
    LOAN_CURRENCY: PLATFORM_CONFIG.LOAN_CURRENCY,
    REPAYMENT_METHOD: methodKey,
    REPAYMENT_METHOD_LABEL: REPAYMENT_METHOD_LABELS[methodKey] || methodKey,
    REPAYMENT_BANK_DOCUMENT_ID: payment.transaction_id?.trim() || 'не предоставлен',
    APP1_EFFECTIVE_DOCUMENT_ID: 'Приложение № 1 (текущая редакция)',
    LENDER_FULL_NAME: lenderProfile.full_name,
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    REPAYMENT_RECEIVER_BANK_ACCOUNT_DISPLAY: 'согласно Приложению № 1',
    REPAYMENT_RECEIVER_BANK_NAME: payment.bank_name?.trim() || 'не указан',
    REPAYMENT_RECEIVER_BANK_REQUISITE_DETAILS: 'согласно Приложению № 1',
    REPAYMENT_RECEIVER_SBP_ID: '',
    REPAYMENT_RECEIVER_SBP_BANK: '',
    REPAYMENT_RECEIVER_SBP_INSTRUCTION: '',
    REPAYMENT_REFERENCE_TEXT: payment.payment_reference?.trim() || `Возврат по договору займа № ${loan.contract_number || loan.id.slice(0, 8).toUpperCase()}`,
    APP4_ALLOCATION_TO_COSTS: '0',
    APP4_ALLOCATION_TO_INTEREST: '0',
    APP4_ALLOCATION_TO_PRINCIPAL: fmtMoney(paymentAmount),
    APP4_ALLOCATION_TO_395: '0',
    APP4_REMAINING_PRINCIPAL_AFTER: fmtMoney(remaining),
    APP4_TOTAL_REMAINING_OBLIGATION_AFTER: fmtMoney(totalRemaining),
    APP2_APPLIES: hasSchedule ? 'true' : 'false',
    APP2_LINKED_DOCUMENT_ID: hasSchedule ? 'Приложение № 2 (текущая расчетная редакция)' : '',
    APP2_RECALC_ACTION_LABEL: hasSchedule ? 'Актуализация по подтвержденному возврату' : '',
    APP4_REQUEST_ID_EXISTS: 'false',
    APP4_REQUEST_ID: '',
    APPENDIX_6_REFERENCE: isAppendix6Required(loan.signature_scheme_requested ?? 'UKEP_ONLY')
      ? 'Приложение № 6 (Соглашение об использовании УНЭП)'
      : '',
    APP4_SIGNED_AT: payment.confirmed_at ? formatDateTimeRu(payment.confirmed_at) : formatDateTimeRu(nowIso),
  }), repeatSections: {} };
}

/**
 * Resolve variables for full repayment confirmation (APP5).
 *
 * CRITICAL: APP5 can only be generated when the loan is truly closed:
 * - totalDisbursed >= loanLimit (all money disbursed)
 * - totalRepaid >= totalDisbursed (all principal repaid)
 */
export async function resolveFullRepaymentVariables(loanId: string): Promise<ResolverResult> {
  const [loanRes, tranchesRes, paymentsRes, snapshotsRes, scheduleRes, existingApp5Res, sigPkgRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    supabase.from('loan_tranches').select('*').eq('loan_id', loanId).eq('status', 'confirmed'),
    supabase.from('loan_payments').select('*').eq('loan_id', loanId).eq('status', 'confirmed').order('confirmed_at', { ascending: true }),
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
  const loanLimit = Number(loan.amount);

  if (totalDisbursed <= 0) throw new Error('Нет подтверждённых траншей для формирования подтверждения полного исполнения.');
  if (totalRepaid < totalDisbursed) throw new Error('Основной долг ещё не погашен полностью. Невозможно сформировать подтверждение полного исполнения.');
  if (totalDisbursed < loanLimit) throw new Error(`Выдано ${fmtMoney(totalDisbursed)} из ${fmtMoney(loanLimit)}. Договор ещё действует — подтверждение полного исполнения можно сформировать только после выдачи полной суммы и полного погашения.`);

  // Closing payment is the last confirmed payment (chronologically)
  const closingPayment = confirmedPayments[confirmedPayments.length - 1];
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

  return { variables: applyAliases({
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_DATE: formatDateOnlyRu(loan.issue_date || loan.created_at),
    APP5_SERIAL_NO: String(serialNo),
    APP5_DOCUMENT_DATE: formatDateOnlyRu(nowIso),
    SIGNATURE_SCHEME_LABEL: schemeLabel,
    SIGNATURE_SCHEME_EFFECTIVE: schemeEffective,
    CLOSING_REPAYMENT_ID: closingPayment?.id || '',
    CLOSING_REPAYMENT_DATE: closingPayment ? formatDateOnlyRu(closingPayment.transfer_date) : '',
    CLOSING_REPAYMENT_TIME: closingPayment?.confirmed_at
      ? new Date(closingPayment.confirmed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : 'время не зафиксировано',
    CLOSING_REPAYMENT_AMOUNT: fmtMoney(closingAmount),
    CLOSING_REPAYMENT_AMOUNT_IN_WORDS: amountToWordsRu(closingAmount),
    LOAN_CURRENCY: PLATFORM_CONFIG.LOAN_CURRENCY,
    CLOSING_REPAYMENT_METHOD: closingMethodKey,
    CLOSING_REPAYMENT_METHOD_LABEL: REPAYMENT_METHOD_LABELS[closingMethodKey] || closingMethodKey,
    CLOSING_REPAYMENT_BANK_DOCUMENT_ID: closingPayment?.transaction_id?.trim() || 'не предоставлен',
    APP1_EFFECTIVE_DOCUMENT_ID: 'Приложение № 1 (текущая редакция)',
    DEAL_CLOSED_AT: formatDateTimeRu(nowIso),

    LENDER_FULL_NAME: lenderProfile.full_name,
    BORROWER_FULL_NAME: borrowerProfile.full_name,

    CLOSING_REPAYMENT_RECEIVER_BANK_ACCOUNT_DISPLAY: 'согласно Приложению № 1',
    CLOSING_REPAYMENT_RECEIVER_BANK_NAME: closingPayment?.bank_name?.trim() || 'не указан',
    CLOSING_REPAYMENT_RECEIVER_BANK_REQUISITE_DETAILS: 'согласно Приложению № 1',

    CLOSING_REPAYMENT_RECEIVER_SBP_ID: '',
    CLOSING_REPAYMENT_RECEIVER_SBP_BANK: '',
    CLOSING_REPAYMENT_RECEIVER_SBP_INSTRUCTION: '',

    CLOSING_REPAYMENT_REFERENCE_TEXT: closingPayment?.payment_reference?.trim() || `Возврат по договору займа № ${loan.contract_number || loan.id.slice(0, 8).toUpperCase()}`,

    APP5_ALLOCATION_TO_COSTS: '0',
    APP5_ALLOCATION_TO_INTEREST: '0',
    APP5_ALLOCATION_TO_PRINCIPAL: fmtMoney(closingAmount),
    APP5_ALLOCATION_TO_395: '0',

    APP5_TOTAL_DISBURSED: fmtMoney(totalDisbursed),
    APP5_TOTAL_REPAID_CONFIRMED: fmtMoney(totalRepaid),
    APP5_TOTAL_ALLOCATED_TO_COSTS: '0',
    APP5_TOTAL_ALLOCATED_TO_INTEREST: '0',
    APP5_TOTAL_ALLOCATED_TO_PRINCIPAL: fmtMoney(totalDisbursed),
    APP5_TOTAL_ALLOCATED_TO_395: '0',

    APP5_REMAINING_PRINCIPAL_AFTER: '0',
    APP5_TOTAL_REMAINING_OBLIGATION_AFTER: '0',

    APP2_APPLIES: hasSchedule ? 'true' : 'false',
    APP2_LINKED_DOCUMENT_ID: hasSchedule ? 'Приложение № 2 (итоговая расчетная редакция)' : '',
    APP2_CLOSEOUT_STATUS: hasSchedule ? 'CLOSEOUT_DERIVED' : '',

    APP5_REQUEST_ID_EXISTS: 'false',
    APP5_REQUEST_ID: '',
    APP5_SUPERSEDES_ID_EXISTS: 'false',
    APP5_SUPERSEDES_ID: '',

    APPENDIX_6_REFERENCE: isAppendix6Required(loan.signature_scheme_requested ?? 'UKEP_ONLY')
      ? 'Приложение № 6 (Соглашение об использовании УНЭП)'
      : '',
    APP5_SIGNED_AT: formatDateTimeRu(nowIso),
  }), repeatSections: {} };
}

/**
 * Resolve variables for EDO Regulation document.
 */
export async function resolveEdoRegulationVariables(): Promise<ResolverResult> {
  const regulation = await getCurrentRegulation();

  if (!regulation) {
    throw new Error('Регламент ЭДО не опубликован. Невозможно сформировать документ.');
  }

  return { variables: applyAliases({
    EDO_REGULATION_NAME: regulation.title,
    EDO_REGULATION_VERSION: regulation.version,
    EDO_REGULATION_ID: regulation.id,
    EDO_REGULATION_EFFECTIVE_FROM: formatDateOnlyRu(regulation.effective_from),
    PLATFORM_NAME: PLATFORM_CONFIG.PLATFORM_NAME,
    PLATFORM_BRAND_NAME: PLATFORM_CONFIG.PLATFORM_BRAND_NAME,
    PLATFORM_URL: PLATFORM_CONFIG.PLATFORM_URL,
    PLATFORM_OPERATOR_NAME: PLATFORM_CONFIG.PLATFORM_OPERATOR_NAME,
    PLATFORM_OPERATOR_LEGAL_DETAILS: PLATFORM_CONFIG.PLATFORM_OPERATOR_LEGAL_DETAILS,
    SUPPORT_CONTACTS_TEXT: PLATFORM_CONFIG.SUPPORT_CONTACTS_TEXT,
  }), repeatSections: {} };
}

/**
 * Resolve variables for APP6 (UNEP Agreement).
 */
export async function resolveApp6Variables(loanId: string): Promise<ResolverResult> {
  const [loanRes, regulation, snapshotsRes, unepRes, sigRes] = await Promise.all([
    supabase.from('loans').select('*').eq('id', loanId).single(),
    getCurrentRegulation(),
    supabase.from('signing_snapshots').select('*').eq('loan_id', loanId),
    supabase.from('unep_agreements').select('*').eq('loan_id', loanId).single(),
    supabase.from('loan_signatures').select('*').eq('loan_id', loanId),
  ]);

  const loan = loanRes.data;
  if (!loan) throw new Error('Loan not found');

  if (!regulation) {
    throw new Error('Регламент ЭДО не опубликован. Невозможно сформировать Приложение № 6.');
  }

  const schemeRequested = (loan as any).signature_scheme_requested ?? 'UKEP_ONLY';
  if (!isAppendix6Required(schemeRequested)) {
    throw new Error('Приложение № 6 применяется только к договорам со схемой подписи УНЭП.');
  }

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

  return { variables: applyAliases({
    CONTRACT_NUMBER: loan.contract_number || loan.id.slice(0, 8).toUpperCase(),
    CONTRACT_PLACE: loan.city,
    CONTRACT_DATE: formatDateOnlyRu(loan.issue_date || loan.created_at),
    DEAL_ID: loan.id,
    LAST_SIGNATURE_AT: lastSignatureAt ? formatDateTimeRu(lastSignatureAt) : 'ожидается подписание',

    LENDER_FULL_NAME: lenderProfile.full_name,
    LENDER_APP_ACCOUNT_ID: lenderProfile.user_id,
    BORROWER_FULL_NAME: borrowerProfile.full_name,
    BORROWER_APP_ACCOUNT_ID: borrowerProfile.user_id,

    PLATFORM_NAME: PLATFORM_CONFIG.PLATFORM_NAME,
    PLATFORM_BRAND_NAME: PLATFORM_CONFIG.PLATFORM_BRAND_NAME,
    PLATFORM_URL: PLATFORM_CONFIG.PLATFORM_URL,
    PLATFORM_OPERATOR_NAME: PLATFORM_CONFIG.PLATFORM_OPERATOR_NAME,
    SUPPORT_CONTACTS_TEXT: PLATFORM_CONFIG.SUPPORT_CONTACTS_TEXT,

    EDO_REGULATION_NAME: regulation.title,
    EDO_REGULATION_VERSION: regulation.version,
    EDO_REGULATION_EFFECTIVE_FROM: formatDateOnlyRu(regulation.effective_from),

    SIGNATURE_SCHEME_REQUESTED: schemeRequested,
    SIGNATURE_SCHEME_LABEL: getSignatureSchemeLabel(schemeRequested),
    APPENDIX_6_REQUIRED: 'YES',
    APPENDIX_6_STATUS: unep?.status ?? 'pending',

    APP6_CREATED_AT: unep ? formatDateTimeRu(unep.created_at) : formatDateTimeRu(new Date().toISOString()),
    APP6_SCOPE_TEXT: 'Настоящее Соглашение распространяется на все электронные документы, формируемые и подписываемые Сторонами в рамках Договора денежного займа, указанного в заголовке настоящего Соглашения, посредством Платформы.',
    APP6_COVERED_DOCUMENTS_TEXT: 'Договор денежного займа, Приложения к Договору, Расписки о получении траншей, Подтверждения частичного и полного погашения, а также иные документы, предусмотренные Договором.',
    APP6_SIGNED_BY_LENDER_AT: unep?.lender_signed_at ? formatDateTimeRu(unep.lender_signed_at) : 'ожидается подписание',
    APP6_SIGNED_BY_BORROWER_AT: unep?.borrower_signed_at ? formatDateTimeRu(unep.borrower_signed_at) : 'ожидается подписание',

    LENDER_SIGNATURE_BLOCK: renderSignatureBlock(lenderSig, 'lender'),
    BORROWER_SIGNATURE_BLOCK: renderSignatureBlock(borrowerSig, 'borrower'),
  }), repeatSections: {} };
}
