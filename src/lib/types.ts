export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Loan {
  id: string;
  lenderName: string;
  borrowerName: string;
  amount: number;
  interestRate: number;
  repaymentDate: string;
  notes: string;
  createdAt: string;
  createdBy: string; // user id
  status: 'active' | 'completed' | 'overdue';
}
