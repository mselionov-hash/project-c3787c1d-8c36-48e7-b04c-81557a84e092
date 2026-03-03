import { User, Loan } from './types';

const USERS_KEY = 'p2p_users';
const LOANS_KEY = 'p2p_loans';
const CURRENT_USER_KEY = 'p2p_current_user';

export function getUsers(): User[] {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

export function saveUser(user: User) {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function findUser(email: string, name?: string): User | undefined {
  return getUsers().find(u => u.email === email && (!name || u.name === name));
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function getLoans(): Loan[] {
  return JSON.parse(localStorage.getItem(LOANS_KEY) || '[]');
}

export function saveLoan(loan: Loan) {
  const loans = getLoans();
  loans.push(loan);
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}

export function getUserLoansAsLender(userName: string): Loan[] {
  return getLoans().filter(l => l.lenderName === userName);
}

export function getUserLoansAsBorrower(userName: string): Loan[] {
  return getLoans().filter(l => l.borrowerName === userName);
}
