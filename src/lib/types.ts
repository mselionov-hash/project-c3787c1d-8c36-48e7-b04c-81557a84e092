export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Loan {
  id: string;
  lenderName: string;
  borrowerName: string;
  lenderPassport: string;
  borrowerPassport: string;
  amount: number;
  interestRate: number;
  penaltyRate: number;
  repaymentDate: string;
  city: string;
  notes: string;
  createdAt: string;
  createdBy: string;
  status: 'active' | 'completed' | 'overdue';
}
