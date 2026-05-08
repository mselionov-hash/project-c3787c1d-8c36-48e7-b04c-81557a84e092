import type { Tables } from '@/integrations/supabase/types';
import { calculateLoanTotals, isLoanOverdue, overdueDays } from '@/lib/loan-status';

type Loan = Tables<'loans'>;
type Tranche = Pick<Tables<'loan_tranches'>, 'amount' | 'status' | 'tranche_number'>;
type Payment = Pick<Tables<'loan_payments'>, 'transfer_amount' | 'status'>;
type Signature = Pick<Tables<'loan_signatures'>, 'role'>;
type AiCheck = Pick<Tables<'ai_fraud_checks'>, 'risk_level' | 'entity_type'>;

export type Role = 'lender' | 'borrower' | 'other';

export type UiAction =
  | 'open_bank_details'
  | 'open_tranches'
  | 'open_repayments'
  | 'open_documents'
  | 'open_tranche_create_modal'
  | 'open_tranche_confirm_modal'
  | 'open_repayment_create_modal'
  | 'open_signature_modal'
  | 'open_send_modal'
  | 'open_edo_acceptance'
  | 'explain_ai_check'
  | 'explain_status'
  | null;

export type Priority = 'primary' | 'secondary' | 'blocked' | 'info';
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface NextActionDescriptor {
  id: string;
  label: string;
  description: string;
  priority: Priority;
  uiAction: UiAction;
  blockedReason?: string;
}

export interface AvailableAction {
  id: string;
  label: string;
  uiAction: UiAction;
  enabled: boolean;
  disabledReason?: string;
}

export interface OperationalState {
  role: Role;
  statusKey: string;
  statusLabel: string;
  tone: Tone;
  isOverdue: boolean;
  overdueDays: number;
  totalDisbursed: number;
  totalRepaid: number;
  outstanding: number;
  nextAction: NextActionDescriptor;
  availableActions: AvailableAction[];
  humanSummary: string;
}

export interface BankReadiness {
  lenderDisbursementReady: boolean;
  borrowerDisbursementReady: boolean;
  lenderRepaymentReady: boolean;
  borrowerRepaymentReady: boolean;
}

export interface EdoState {
  required: boolean;
  acceptedByUser: boolean;
  acceptedByCounterparty: boolean;
}

export interface OperationalParams {
  loan: Loan;
  userId: string;
  tranches: Tranche[];
  payments: Payment[];
  bankReadiness: BankReadiness;
  signatures: Signature[];
  latestAiChecks?: AiCheck[];
  edo?: EdoState;
}

const STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  awaiting_signatures: { label: 'Ожидает подписания', tone: 'warning' },
  signed_by_lender: { label: 'Ждёт подпись заёмщика', tone: 'info' },
  signed_by_borrower: { label: 'Ждёт подпись займодавца', tone: 'info' },
  fully_signed: { label: 'Подписан', tone: 'success' },
  signed_no_debt: { label: 'Подписан, денег ещё не выдавали', tone: 'success' },
  active: { label: 'Действующий займ', tone: 'success' },
  repaid: { label: 'Полностью погашён', tone: 'neutral' },
};

function getRole(loan: Loan, userId: string): Role {
  if (loan.lender_id === userId) return 'lender';
  if (loan.borrower_id === userId) return 'borrower';
  return 'other';
}

function isFullySignedByBoth(loan: Loan, signatures: Signature[]): boolean {
  if (['fully_signed', 'signed_no_debt', 'active', 'repaid'].includes(loan.status)) return true;
  const hasL = signatures.some((s) => s.role === 'lender');
  const hasB = signatures.some((s) => s.role === 'borrower');
  return hasL && hasB;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'дня';
  return 'дней';
}

const fmtRub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;

export function getLoanOperationalState(params: OperationalParams): OperationalState {
  const { loan, userId, tranches, payments, bankReadiness, signatures, latestAiChecks = [], edo } = params;
  const role = getRole(loan, userId);
  const totals = calculateLoanTotals(tranches, payments);
  const overdue = isLoanOverdue(loan, tranches, payments);
  const overdueN = overdue ? overdueDays(loan.repayment_date) : 0;

  // Status key/label/tone
  let statusKey = loan.status;
  let statusEntry = STATUS_LABELS[statusKey] || { label: loan.status, tone: 'neutral' as Tone };
  let tone: Tone = statusEntry.tone;
  let statusLabel = statusEntry.label;
  if (overdue) {
    statusKey = 'overdue';
    statusLabel = 'Просрочен';
    tone = 'danger';
  }

  // Pre-compute flags
  const isSelfLoan = !!loan.borrower_id && loan.lender_id === loan.borrower_id;
  const fullySigned = isFullySignedByBoth(loan, signatures);
  const userSigned = signatures.some((s) =>
    (role === 'lender' && s.role === 'lender') || (role === 'borrower' && s.role === 'borrower')
  );
  const counterpartySigned = signatures.some((s) =>
    (role === 'lender' && s.role === 'borrower') || (role === 'borrower' && s.role === 'lender')
  );
  const mySideReady = role === 'lender'
    ? (bankReadiness.lenderDisbursementReady && bankReadiness.lenderRepaymentReady)
    : role === 'borrower'
    ? bankReadiness.borrowerDisbursementReady
    : false;
  const counterpartyReady = role === 'lender'
    ? bankReadiness.borrowerDisbursementReady
    : role === 'borrower'
    ? (bankReadiness.lenderDisbursementReady && bankReadiness.lenderRepaymentReady)
    : false;
  const trancheReady = bankReadiness.lenderDisbursementReady && bankReadiness.borrowerDisbursementReady;
  const hasConfirmedTranche = tranches.some((t) => t.status === 'confirmed');
  const pendingTranches = tranches.filter((t) => t.status === 'sent');
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const latestAi = latestAiChecks[0];
  const aiBlocking = latestAi && (latestAi.risk_level === 'HIGH' || latestAi.risk_level === 'BLOCKING');
  const loanLimit = Number(loan.amount) || 0;
  const canIssueMore = totals.totalDisbursed < loanLimit;

  // Decide nextAction by priority
  let nextAction: NextActionDescriptor;

  if (isSelfLoan) {
    nextAction = {
      id: 'invalid_self_loan',
      label: 'Договор требует исправления данных',
      description: 'Займодавец и заёмщик — один и тот же пользователь. Действия по договору заблокированы.',
      priority: 'blocked',
      uiAction: null,
      blockedReason: 'Совпадают стороны договора',
    };
  } else if (loan.status === 'draft' && role === 'lender') {
    nextAction = {
      id: 'send_to_borrower',
      label: 'Отправить заёмщику',
      description: 'Договор сохранён как черновик. Отправьте его заёмщику, чтобы продолжить.',
      priority: 'primary',
      uiAction: 'open_send_modal',
    };
  } else if (loan.status === 'draft') {
    nextAction = {
      id: 'wait_lender_send',
      label: 'Ожидаем отправку договора',
      description: 'Займодавец готовит договор и отправит его вам.',
      priority: 'info',
      uiAction: null,
    };
  } else if (!fullySigned && !userSigned && (role === 'lender' || role === 'borrower')) {
    // Check EDO gate first
    if (edo?.required && !edo.acceptedByUser) {
      nextAction = {
        id: 'accept_edo',
        label: 'Принять Регламент ЭДО',
        description: 'Для подписания по схеме УНЭП обе стороны должны принять Регламент ЭДО.',
        priority: 'primary',
        uiAction: 'open_edo_acceptance',
      };
    } else if (edo?.required && !edo.acceptedByCounterparty) {
      nextAction = {
        id: 'wait_edo_counterparty',
        label: 'Ожидаем принятие Регламента второй стороной',
        description: 'Вы приняли Регламент ЭДО. Ждём, пока вторая сторона примет регламент.',
        priority: 'info',
        uiAction: null,
      };
    } else {
      nextAction = {
        id: 'sign_contract',
        label: 'Подписать договор',
        description: 'Договор готов к подписанию. Подпишите, чтобы продолжить сделку.',
        priority: 'primary',
        uiAction: 'open_signature_modal',
      };
    }
  } else if (!fullySigned && userSigned) {
    nextAction = {
      id: 'wait_counterparty_signature',
      label: 'Ожидаем подпись второй стороны',
      description: 'Вы уже подписали договор. Ждём подпись второй стороны.',
      priority: 'info',
      uiAction: null,
    };
  } else if (!mySideReady && (role === 'lender' || role === 'borrower')) {
    nextAction = {
      id: 'choose_my_bank_details',
      label: 'Выбрать реквизиты',
      description: role === 'lender'
        ? 'Выберите свои реквизиты для перечисления денег и для получения возврата.'
        : 'Укажите реквизиты, на которые займодавец перечислит деньги.',
      priority: 'primary',
      uiAction: 'open_bank_details',
    };
  } else if (!counterpartyReady && (role === 'lender' || role === 'borrower')) {
    nextAction = {
      id: 'wait_counterparty_bank_details',
      label: 'Ожидаем реквизиты второй стороны',
      description: 'Ваши реквизиты выбраны. Ждём, пока вторая сторона укажет свои реквизиты.',
      priority: 'info',
      uiAction: null,
    };
  } else if (aiBlocking) {
    const isTranche = latestAi?.entity_type === 'tranche';
    nextAction = {
      id: 'fix_ai_check',
      label: role === 'lender' && !isTranche ? 'Проверить чек по возврату' : 'Загрузить корректный чек',
      description: 'Последняя проверка чека показала проблемы. Откройте проверку и при необходимости загрузите другой чек.',
      priority: 'primary',
      uiAction: 'explain_ai_check',
    };
  } else if (pendingTranches.length > 0 && role === 'borrower') {
    nextAction = {
      id: 'confirm_tranche',
      label: 'Подтвердить транш',
      description: 'Займодавец отметил перевод. Проверьте поступление и подтвердите получение.',
      priority: 'primary',
      uiAction: 'open_tranche_confirm_modal',
    };
  } else if (pendingTranches.length > 0 && role === 'lender') {
    nextAction = {
      id: 'wait_tranche_confirmation',
      label: 'Ожидаем подтверждение транша',
      description: 'Вы отметили перевод. Ждём, пока заёмщик подтвердит получение средств.',
      priority: 'info',
      uiAction: 'open_tranches',
    };
  } else if (!hasConfirmedTranche && trancheReady && role === 'lender' && canIssueMore) {
    nextAction = {
      id: 'create_tranche',
      label: 'Сделать транш',
      description: 'Реквизиты сторон выбраны. Создайте транш и переведите деньги заёмщику.',
      priority: 'primary',
      uiAction: 'open_tranche_create_modal',
    };
  } else if (!hasConfirmedTranche && trancheReady && role === 'borrower') {
    nextAction = {
      id: 'wait_tranche',
      label: 'Ожидаем перевод от займодавца',
      description: 'Реквизиты сторон выбраны. Ждём, пока займодавец сделает перевод.',
      priority: 'info',
      uiAction: null,
    };
  } else if (pendingPayments.length > 0 && role === 'lender') {
    nextAction = {
      id: 'confirm_repayment',
      label: 'Подтвердить погашение',
      description: 'Заёмщик отметил погашение. Проверьте поступление и подтвердите его.',
      priority: 'primary',
      uiAction: 'open_repayments',
    };
  } else if (pendingPayments.length > 0 && role === 'borrower') {
    nextAction = {
      id: 'wait_repayment_confirmation',
      label: 'Ожидаем подтверждение погашения',
      description: 'Вы зафиксировали погашение. Ждём, пока займодавец подтвердит поступление средств.',
      priority: 'info',
      uiAction: 'open_repayments',
    };
  } else if (overdue && totals.outstanding > 0 && role === 'borrower') {
    nextAction = {
      id: 'repay_overdue',
      label: 'Погасить задолженность',
      description: `Срок возврата прошёл ${overdueN} ${pluralDays(overdueN)} назад. Остаток долга — ${fmtRub(totals.outstanding)}. Сделайте перевод и зафиксируйте погашение.`,
      priority: 'primary',
      uiAction: 'open_repayment_create_modal',
    };
  } else if (overdue && totals.outstanding > 0 && role === 'lender') {
    nextAction = {
      id: 'wait_overdue_repayment',
      label: 'Ожидаем погашение',
      description: `Срок возврата прошёл ${overdueN} ${pluralDays(overdueN)} назад. Остаток долга заёмщика — ${fmtRub(totals.outstanding)}. Ждите перевод и подтвердите его при поступлении.`,
      priority: 'primary',
      uiAction: 'open_repayments',
    };
  } else if (totals.outstanding > 0 && role === 'borrower') {
    nextAction = {
      id: 'repay_debt',
      label: 'Погасить долг',
      description: `Текущий остаток долга — ${fmtRub(totals.outstanding)}. Сделайте перевод по реквизитам займодавца.`,
      priority: 'primary',
      uiAction: 'open_repayment_create_modal',
    };
  } else if (totals.outstanding > 0 && role === 'lender') {
    nextAction = {
      id: 'wait_repayment',
      label: 'Ожидаем погашение',
      description: `Остаток долга заёмщика — ${fmtRub(totals.outstanding)}. Ждём перевод от заёмщика.`,
      priority: 'info',
      uiAction: 'open_repayments',
    };
  } else if (loan.status === 'repaid' || (totals.outstanding <= 0 && hasConfirmedTranche && totals.totalDisbursed >= loanLimit)) {
    nextAction = {
      id: 'generate_full_repayment',
      label: 'Сформировать подтверждение полного погашения',
      description: 'Долг полностью погашен. Откройте раздел документов и сформируйте итоговое подтверждение.',
      priority: 'secondary',
      uiAction: 'open_documents',
    };
  } else {
    nextAction = {
      id: 'all_good',
      label: 'Всё в порядке',
      description: 'Срочных действий нет.',
      priority: 'info',
      uiAction: null,
    };
  }

  // Available actions (visibility filtered)
  const availableActions: AvailableAction[] = [];
  if (role === 'lender' && !hasConfirmedTranche === false ? false : true) {
    if (role === 'lender' && fullySigned && trancheReady && canIssueMore && !isSelfLoan) {
      availableActions.push({
        id: 'create_tranche', label: 'Сделать транш', uiAction: 'open_tranche_create_modal', enabled: true,
      });
    }
    if (role === 'borrower' && pendingTranches.length > 0) {
      availableActions.push({
        id: 'confirm_tranche', label: 'Подтвердить транш', uiAction: 'open_tranche_confirm_modal', enabled: true,
      });
    }
    if (role === 'borrower' && totals.outstanding > 0) {
      availableActions.push({
        id: 'repay', label: overdue ? 'Погасить задолженность' : 'Погасить долг', uiAction: 'open_repayment_create_modal', enabled: true,
      });
    }
    if (role === 'lender' && pendingPayments.length > 0) {
      availableActions.push({
        id: 'confirm_repayment', label: 'Подтвердить погашение', uiAction: 'open_repayments', enabled: true,
      });
    }
    if (!mySideReady && fullySigned && (role === 'lender' || role === 'borrower')) {
      availableActions.push({
        id: 'choose_bank_details', label: 'Выбрать реквизиты', uiAction: 'open_bank_details', enabled: true,
      });
    }
    if (aiBlocking) {
      availableActions.push({
        id: 'explain_ai_check', label: 'Подробнее о проверке', uiAction: 'explain_ai_check', enabled: true,
      });
    }
    availableActions.push({
      id: 'open_documents', label: 'Открыть документы', uiAction: 'open_documents', enabled: true,
    });
  }

  // Human summary
  const youAre = role === 'lender' ? 'Вы — займодавец.' : role === 'borrower' ? 'Вы — заёмщик.' : '';
  const stateLine = `Состояние займа: ${statusLabel.toLowerCase()}.`;
  const moneyLine = hasConfirmedTranche
    ? `Сумма займа ${fmtRub(loanLimit)}. Выдано ${fmtRub(totals.totalDisbursed)}, возвращено ${fmtRub(totals.totalRepaid)}, остаток ${fmtRub(totals.outstanding)}.`
    : `Сумма займа ${fmtRub(loanLimit)}. Денег пока не выдано.`;
  const overdueLine = overdue
    ? ` Займ просрочен на ${overdueN} ${pluralDays(overdueN)}.`
    : '';
  const nextLine = ` Следующий шаг: ${nextAction.label.toLowerCase()}.`;
  const humanSummary = `${youAre} ${stateLine} ${moneyLine}${overdueLine}${nextLine}`.trim();

  return {
    role,
    statusKey,
    statusLabel,
    tone,
    isOverdue: overdue,
    overdueDays: overdueN,
    totalDisbursed: totals.totalDisbursed,
    totalRepaid: totals.totalRepaid,
    outstanding: totals.outstanding,
    nextAction,
    availableActions,
    humanSummary,
  };
}
