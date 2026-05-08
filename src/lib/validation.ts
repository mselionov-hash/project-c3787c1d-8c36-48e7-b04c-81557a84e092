// Centralized input validators for profile, bank details, and loan flows.
// Each helper returns { valid, error?, normalizedValue? }.

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedValue?: string;
}

const ok = (normalizedValue?: string): ValidationResult => ({ valid: true, normalizedValue });
const fail = (error: string): ValidationResult => ({ valid: false, error });

const JUNK_VALUES = new Set([
  'test', 'тест', '123', '1234', '12345', 'qwerty', 'aaaa', 'asdf', 'home', 'дом',
]);

const isJunk = (value: string): boolean => {
  const lower = value.trim().toLowerCase();
  if (!lower) return true;
  if (JUNK_VALUES.has(lower)) return true;
  if (/^(.)\1{3,}$/.test(lower)) return true; // aaaa, 1111
  if (/^[^\p{L}\p{N}]+$/u.test(lower)) return true; // only symbols
  return false;
};

export function validateFullName(value: string): ValidationResult {
  const v = value.trim().replace(/\s+/g, ' ');
  if (!v) return fail('ФИО обязательно');
  if (v.length < 2 || v.length > 120) return fail('ФИО должно быть от 2 до 120 символов');
  if (isJunk(v)) return fail('Введите настоящее ФИО');
  if (!/^[A-Za-zА-Яа-яЁё\-\s.]+$/.test(v)) return fail('Допустимы только буквы, пробелы и дефис');
  if (v.split(' ').filter(Boolean).length < 2) return fail('Укажите как минимум имя и фамилию');
  return ok(v);
}

export function validateEmail(value: string): ValidationResult {
  const v = value.trim().toLowerCase();
  if (!v) return fail('Email обязателен');
  if (v.length > 254) return fail('Email слишком длинный');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return fail('Некорректный email');
  return ok(v);
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return '+7' + digits.slice(1);
  }
  if (digits.length === 10) return '+7' + digits;
  if (digits.startsWith('7') && digits.length === 11) return '+' + digits;
  return value.startsWith('+') ? '+' + digits : digits;
}

export function validatePhone(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return fail('Телефон обязателен');
  const normalized = normalizePhone(v);
  if (!/^\+7\d{10}$/.test(normalized)) return fail('Телефон должен быть в формате +7XXXXXXXXXX');
  const tail = normalized.slice(2);
  if (/^(\d)\1{9}$/.test(tail)) return fail('Введите настоящий номер телефона');
  return ok(normalized);
}

export function validateRussianPassportSeries(value: string): ValidationResult {
  const v = value.replace(/\s/g, '');
  if (!/^\d{4}$/.test(v)) return fail('Серия паспорта должна состоять из 4 цифр');
  return ok(v);
}

export function validateRussianPassportNumber(value: string): ValidationResult {
  const v = value.replace(/\s/g, '');
  if (!/^\d{6}$/.test(v)) return fail('Номер паспорта должен состоять из 6 цифр');
  return ok(v);
}

export function validateDivisionCode(value: string): ValidationResult {
  const v = value.trim();
  if (!/^\d{3}-\d{3}$/.test(v)) return fail('Код подразделения должен быть в формате 000-000');
  return ok(v);
}

export function validateBirthDate(value: string): ValidationResult {
  if (!value) return fail('Дата рождения обязательна');
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fail('Некорректная дата');
  const now = new Date();
  if (d > now) return fail('Дата рождения не может быть в будущем');
  const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 18) return fail('Пользователь должен быть старше 18 лет');
  if (age > 120) return fail('Некорректная дата рождения');
  return ok(value);
}

export function validatePassportIssueDate(value: string, birthDate?: string | null): ValidationResult {
  if (!value) return fail('Дата выдачи паспорта обязательна');
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fail('Некорректная дата');
  if (d > new Date()) return fail('Дата выдачи не может быть в будущем');
  if (birthDate) {
    const b = new Date(birthDate);
    if (!Number.isNaN(b.getTime()) && d < b) return fail('Дата выдачи раньше даты рождения');
  }
  return ok(value);
}

export function validateAddress(value: string): ValidationResult {
  const v = value.trim().replace(/\s+/g, ' ');
  if (!v) return fail('Адрес обязателен');
  if (v.length < 10 || v.length > 300) return fail('Адрес должен быть от 10 до 300 символов');
  if (isJunk(v)) return fail('Укажите полный адрес');
  return ok(v);
}

export function validateBik(value: string): ValidationResult {
  const v = value.replace(/\s/g, '');
  if (!/^\d{9}$/.test(v)) return fail('БИК должен состоять из 9 цифр');
  return ok(v);
}

export function validateAccountNumber(value: string): ValidationResult {
  const v = value.replace(/\s/g, '');
  if (!/^\d{20}$/.test(v)) return fail('Расчётный счёт должен состоять из 20 цифр');
  return ok(v);
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(value: string): ValidationResult {
  const v = value.replace(/\s|-/g, '');
  if (!/^\d{16,19}$/.test(v)) return fail('Номер карты должен содержать 16–19 цифр');
  if (!luhnCheck(v)) return fail('Некорректный номер карты');
  return ok(v);
}

export function validateBankName(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return fail('Название банка обязательно');
  if (v.length < 2 || v.length > 100) return fail('Название банка должно быть от 2 до 100 символов');
  if (/^\d+$/.test(v)) return fail('Введите название банка');
  if (isJunk(v)) return fail('Введите корректное название банка');
  return ok(v);
}

export function validateTransferLink(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return ok('');
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol)) return fail('Допустимы только ссылки http/https');
    return ok(u.toString());
  } catch {
    return fail('Введите корректную ссылку (URL)');
  }
}

export interface LoanAmountOptions { min?: number; max?: number }

export function validateLoanAmount(value: string | number, opts: LoanAmountOptions = {}): ValidationResult {
  const min = opts.min ?? 1000;
  const max = opts.max ?? 10_000_000;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/\s|,/g, '.'));
  if (!Number.isFinite(n)) return fail('Введите корректную сумму');
  if (n <= 0) return fail('Сумма должна быть больше нуля');
  if (n < min) return fail(`Минимальная сумма ${min.toLocaleString('ru-RU')} ₽`);
  if (n > max) return fail(`Максимальная сумма ${max.toLocaleString('ru-RU')} ₽`);
  return ok(String(n));
}

export function validateRepaymentDate(value: string, issueDate?: string): ValidationResult {
  if (!value) return fail('Дата возврата обязательна');
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fail('Некорректная дата');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (d <= now) return fail('Дата возврата должна быть в будущем');
  if (issueDate) {
    const i = new Date(issueDate);
    if (!Number.isNaN(i.getTime()) && d <= i) return fail('Дата возврата должна быть позже даты выдачи');
  }
  const max = new Date(); max.setFullYear(max.getFullYear() + 10);
  if (d > max) return fail('Срок займа не должен превышать 10 лет');
  return ok(value);
}

export function validateInterestRate(value: string | number, mode: string): ValidationResult {
  if (mode === 'interest_free') return ok('0');
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) return fail('Введите ставку');
  if (n < 0) return fail('Ставка не может быть отрицательной');
  if (n > 100) return fail('Ставка не должна превышать 100% годовых');
  return ok(String(n));
}

export function validatePenaltyRate(value: string | number): ValidationResult {
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) return fail('Введите неустойку');
  if (n < 0) return fail('Неустойка не может быть отрицательной');
  if (n > 1) return fail('Неустойка не должна превышать 1% в день');
  return ok(String(n));
}

/**
 * Check that a counterparty isn't the current user.
 * Pass any combination of known IDs/emails — we only fail when there's a clear match.
 */
export function validateNotSelfLoan(params: {
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  counterpartyUserId?: string | null;
  counterpartyEmail?: string | null;
  lenderId?: string | null;
  borrowerId?: string | null;
}): ValidationResult {
  const me = params.currentUserId || undefined;
  const myEmail = (params.currentUserEmail || '').trim().toLowerCase() || undefined;
  const otherId = params.counterpartyUserId || undefined;
  const otherEmail = (params.counterpartyEmail || '').trim().toLowerCase() || undefined;

  if (me && otherId && me === otherId) {
    return fail('Нельзя создать займ самому себе. Укажите другого заёмщика.');
  }
  if (myEmail && otherEmail && myEmail === otherEmail) {
    return fail('Нельзя указать собственный email в качестве заёмщика.');
  }
  if (params.lenderId && params.borrowerId && params.lenderId === params.borrowerId) {
    return fail('Вы не можете быть одновременно займодавцем и заёмщиком по одному займу.');
  }
  return ok();
}
