export interface ExpenseType {
  id: number;
  name: string;
  description: string;
  allowanceAmount: number;
  period: 'daily' | 'weekly' | 'monthly';
  active: boolean;
}

export interface AllowanceUsage {
  expenseTypeId: number;
  amount: number;
  orderId: string;
  date: string;
}
