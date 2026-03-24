import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { User, SavedAddress, PaymentMethod } from '../models';

const MOCK_USER: User = {
  id: 1,
  firstName: 'Alex',
  lastName: 'Kim',
  email: 'alex.kim@example.com',
  phone: '555-555-1234',
  addresses: [
    { id: 1, label: 'Home', street: '123 Main St, New York, NY 10001' },
    { id: 2, label: 'Work', street: '456 Park Ave, New York, NY 10022' }
  ],
  paymentMethods: [
    { id: 1, last4: '4242', brand: 'Visa', isDefault: true }
  ]
};

const STORAGE_KEY = 'app_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(this.loadFromStorage());
  isLoggedIn = computed(() => this.currentUser() !== null);

  private loadFromStorage(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(user: User | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  login(email: string, _password: string): Observable<User> {
    const user = { ...MOCK_USER, email };
    this.currentUser.set(user);
    this.saveToStorage(user);
    return of(user).pipe(delay(500));
  }

  logout(): void {
    this.currentUser.set(null);
    this.saveToStorage(null);
  }

  updateProfile(patch: Partial<User>): Observable<User> {
    const updated = { ...this.currentUser()!, ...patch };
    this.currentUser.set(updated);
    this.saveToStorage(updated);
    return of(updated).pipe(delay(300));
  }

  addAddress(address: Omit<SavedAddress, 'id'>): Observable<SavedAddress> {
    const user = this.currentUser()!;
    const newAddr: SavedAddress = { ...address, id: Date.now() };
    const updated = { ...user, addresses: [...user.addresses, newAddr] };
    this.currentUser.set(updated);
    this.saveToStorage(updated);
    return of(newAddr).pipe(delay(300));
  }

  deleteAddress(id: number): Observable<void> {
    const user = this.currentUser()!;
    const updated = { ...user, addresses: user.addresses.filter(a => a.id !== id) };
    this.currentUser.set(updated);
    this.saveToStorage(updated);
    return of(undefined).pipe(delay(300));
  }

  addPaymentMethod(pm: Omit<PaymentMethod, 'id'>): Observable<PaymentMethod> {
    const user = this.currentUser()!;
    const newPm: PaymentMethod = { ...pm, id: Date.now() };
    const methods = pm.isDefault
      ? user.paymentMethods.map(m => ({ ...m, isDefault: false }))
      : user.paymentMethods;
    const updated = { ...user, paymentMethods: [...methods, newPm] };
    this.currentUser.set(updated);
    this.saveToStorage(updated);
    return of(newPm).pipe(delay(300));
  }

  deletePaymentMethod(id: number): Observable<void> {
    const user = this.currentUser()!;
    const updated = { ...user, paymentMethods: user.paymentMethods.filter(m => m.id !== id) };
    this.currentUser.set(updated);
    this.saveToStorage(updated);
    return of(undefined).pipe(delay(300));
  }

  setDefaultPaymentMethod(id: number): Observable<void> {
    const user = this.currentUser()!;
    const updated = {
      ...user,
      paymentMethods: user.paymentMethods.map(m => ({ ...m, isDefault: m.id === id }))
    };
    this.currentUser.set(updated);
    this.saveToStorage(updated);
    return of(undefined).pipe(delay(300));
  }
}
