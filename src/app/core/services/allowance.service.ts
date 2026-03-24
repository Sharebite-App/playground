import { Injectable, signal, computed } from '@angular/core';
import { ExpenseType, AllowanceUsage } from '../models';

const EXPENSE_TYPES: ExpenseType[] = [
  {
    id: 1,
    name: 'Lunch',
    description: 'Weekday lunch — resets every day',
    allowanceAmount: 15.00,
    period: 'daily',
    active: true
  },
  {
    id: 2,
    name: 'Dinner',
    description: 'Working-late dinner — resets every day',
    allowanceAmount: 25.00,
    period: 'daily',
    active: true
  },
  {
    id: 3,
    name: 'Team Meal',
    description: 'Team lunch or dinner — resets every week',
    allowanceAmount: 50.00,
    period: 'weekly',
    active: true
  },
  {
    id: 4,
    name: 'Client Entertainment',
    description: 'Meals with clients or prospects — resets every month',
    allowanceAmount: 100.00,
    period: 'monthly',
    active: true
  }
];

const STORAGE_KEY = 'app_allowance_usages';

@Injectable({ providedIn: 'root' })
export class AllowanceService {
  expenseTypes = signal<ExpenseType[]>(EXPENSE_TYPES);
  private usages = signal<AllowanceUsage[]>(this.loadUsages());

  private loadUsages(): AllowanceUsage[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveUsages(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.usages()));
  }

  private getPeriodStart(period: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    if (period === 'daily') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    if (period === 'weekly') {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday as week start
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  getUsedAmount(expenseTypeId: number): number {
    const et = this.expenseTypes().find(e => e.id === expenseTypeId);
    if (!et) return 0;
    const periodStart = this.getPeriodStart(et.period);
    return this.usages()
      .filter(u => u.expenseTypeId === expenseTypeId && new Date(u.date) >= periodStart)
      .reduce((sum, u) => sum + u.amount, 0);
  }

  getRemaining(expenseTypeId: number): number {
    const et = this.expenseTypes().find(e => e.id === expenseTypeId);
    if (!et) return 0;
    return Math.max(0, et.allowanceAmount - this.getUsedAmount(expenseTypeId));
  }

  /** How much of `orderTotal` the allowance will cover. */
  getCovered(expenseTypeId: number, orderTotal: number): number {
    return Math.min(orderTotal, this.getRemaining(expenseTypeId));
  }

  recordUsage(expenseTypeId: number, amount: number, orderId: string): void {
    this.usages.update(list => [
      ...list,
      { expenseTypeId, amount, orderId, date: new Date().toISOString() }
    ]);
    this.saveUsages();
  }

  /** All usages for a given expense type, newest first. */
  getUsageHistory(expenseTypeId: number): AllowanceUsage[] {
    return this.usages()
      .filter(u => u.expenseTypeId === expenseTypeId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  periodLabel(period: 'daily' | 'weekly' | 'monthly'): string {
    return period === 'daily' ? 'per day' : period === 'weekly' ? 'per week' : 'per month';
  }
}
