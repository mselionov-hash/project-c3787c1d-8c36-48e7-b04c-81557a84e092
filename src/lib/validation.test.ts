import { describe, it, expect } from 'vitest';
import {
  validateCardNumber, validateRussianPassportSeries, validateRussianPassportNumber,
  validateBik, validateAccountNumber, validateLoanAmount, validateRepaymentDate,
  validateNotSelfLoan, validateEmail, validatePhone,
} from './validation';

describe('validation', () => {
  it('Luhn: valid card 4111111111111111 passes', () => {
    expect(validateCardNumber('4111111111111111').valid).toBe(true);
  });
  it('Luhn: invalid card 4111111111111112 fails', () => {
    expect(validateCardNumber('4111111111111112').valid).toBe(false);
  });
  it('passport series "123" invalid', () => {
    expect(validateRussianPassportSeries('123').valid).toBe(false);
  });
  it('passport series "1234" valid', () => {
    expect(validateRussianPassportSeries('1234').valid).toBe(true);
  });
  it('passport number "abc123" invalid', () => {
    expect(validateRussianPassportNumber('abc123').valid).toBe(false);
  });
  it('BIK "12345" invalid; "044525225" valid', () => {
    expect(validateBik('12345').valid).toBe(false);
    expect(validateBik('044525225').valid).toBe(true);
  });
  it('account 19 digits invalid; 20 digits valid', () => {
    expect(validateAccountNumber('1'.repeat(19)).valid).toBe(false);
    expect(validateAccountNumber('1'.repeat(20)).valid).toBe(true);
  });
  it('amount 0 / negative blocked; 50_000 valid', () => {
    expect(validateLoanAmount('0').valid).toBe(false);
    expect(validateLoanAmount('-1').valid).toBe(false);
    expect(validateLoanAmount('50000').valid).toBe(true);
  });
  it('repayment date in past blocked; future ok', () => {
    expect(validateRepaymentDate('2000-01-01').valid).toBe(false);
    const future = new Date(); future.setFullYear(future.getFullYear() + 1);
    expect(validateRepaymentDate(future.toISOString().slice(0, 10)).valid).toBe(true);
  });
  it('self-loan: same id blocked', () => {
    expect(validateNotSelfLoan({ currentUserId: 'a', counterpartyUserId: 'a' }).valid).toBe(false);
    expect(validateNotSelfLoan({ currentUserId: 'a', counterpartyUserId: 'b' }).valid).toBe(true);
  });
  it('self-loan: same email blocked (case-insensitive)', () => {
    expect(validateNotSelfLoan({ currentUserEmail: 'A@b.com', counterpartyEmail: 'a@B.com' }).valid).toBe(false);
  });
  it('email + phone normalize', () => {
    expect(validateEmail(' Foo@Bar.com ').normalizedValue).toBe('foo@bar.com');
    expect(validatePhone('8 (999) 123-45-67').normalizedValue).toBe('+79991234567');
  });
});
