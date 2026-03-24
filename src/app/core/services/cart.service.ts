import { Injectable, signal, computed, effect } from '@angular/core';
import { CartItem } from '../models';

const STORAGE_KEY = 'app_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>(this.loadFromStorage());
  isOpen = signal<boolean>(false);

  itemCount = computed(() => this.items().reduce((n, i) => n + i.quantity, 0));

  subtotal = computed(() =>
    this.items().reduce((s, i) => {
      const optionsTotal = i.selectedOptions.reduce((o, opt) => o + opt.priceAdd, 0);
      return s + (i.price + optionsTotal) * i.quantity;
    }, 0)
  );

  currentRestaurantId = computed(() =>
    this.items().length > 0 ? this.items()[0].restaurantId : null
  );

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items()));
    });
  }

  private loadFromStorage(): CartItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  addItem(item: CartItem): void {
    const existing = this.items().find(
      i => i.menuItemId === item.menuItemId &&
           JSON.stringify(i.selectedOptions) === JSON.stringify(item.selectedOptions)
    );
    if (existing) {
      this.updateQuantity(existing.menuItemId, existing.quantity + item.quantity, item.selectedOptions);
    } else {
      this.items.update(items => [...items, item]);
    }
  }

  removeItem(menuItemId: number, selectedOptions?: CartItem['selectedOptions']): void {
    this.items.update(items =>
      items.filter(i => {
        if (i.menuItemId !== menuItemId) return true;
        if (!selectedOptions) return false;
        return JSON.stringify(i.selectedOptions) !== JSON.stringify(selectedOptions);
      })
    );
  }

  updateQuantity(menuItemId: number, qty: number, selectedOptions?: CartItem['selectedOptions']): void {
    if (qty <= 0) {
      this.removeItem(menuItemId, selectedOptions);
      return;
    }
    this.items.update(items =>
      items.map(i => {
        if (i.menuItemId !== menuItemId) return i;
        if (selectedOptions && JSON.stringify(i.selectedOptions) !== JSON.stringify(selectedOptions)) return i;
        return { ...i, quantity: qty };
      })
    );
  }

  clear(): void {
    this.items.set([]);
  }

  openDrawer(): void {
    this.isOpen.set(true);
  }

  closeDrawer(): void {
    this.isOpen.set(false);
  }

  toggleDrawer(): void {
    this.isOpen.update(v => !v);
  }
}
