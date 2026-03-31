export const BASE_URL = "http://localhost:3001";
export const DEFAULT_GROUP_ID = "8d42bd3a-ba70-4576-a4e8-605f5a61de4a";

export type Balance = { userId: string; userName: string; balance: number };

export type Debt = {
  id: string;
  amount: number;
  isPaid: boolean;
  debtorId: string;
  creditorId: string;
  expenseId: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  isRecurring: boolean;
  creatorId: string;
  debts: Debt[];
};

export type Settlement = { fromName: string; toName: string; amount: number };

export type ToastState = { type: "success" | "error"; message: string } | null;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};
