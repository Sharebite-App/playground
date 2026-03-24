import { Injectable } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
import { Restaurant, MenuCategory, Order, PlaceOrderPayload } from '../models';

import RESTAURANTS from '../../../assets/mock-data/restaurants.json';
import MENUS from '../../../assets/mock-data/menus.json';
import ORDERS from '../../../assets/mock-data/orders.json';

@Injectable({ providedIn: 'root' })
export class MockApiService {
  private restaurants: Restaurant[] = RESTAURANTS as Restaurant[];
  private menus: MenuCategory[] = MENUS as MenuCategory[];
  private orders: Order[] = ORDERS as Order[];

  getRestaurants(query?: string, cuisine?: string): Observable<Restaurant[]> {
    return of(this.restaurants).pipe(
      delay(300),
      map(list => {
        let result = list;
        if (query) {
          const q = query.toLowerCase();
          result = result.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.cuisine.some(c => c.toLowerCase().includes(q))
          );
        }
        if (cuisine && cuisine !== 'All') {
          result = result.filter(r => r.cuisine.includes(cuisine));
        }
        return result;
      })
    );
  }

  getRestaurant(id: number): Observable<Restaurant | undefined> {
    return of(this.restaurants.find(r => r.id === id)).pipe(delay(200));
  }

  getMenu(restaurantId: number): Observable<MenuCategory[]> {
    return of(this.menus.filter(c => c.restaurantId === restaurantId)).pipe(delay(300));
  }

  placeOrder(payload: PlaceOrderPayload): Observable<Order> {
    const order: Order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      restaurantId: payload.restaurantId,
      restaurantName: payload.restaurantName,
      items: payload.items,
      subtotal: payload.subtotal,
      tax: payload.tax,
      deliveryFee: payload.deliveryFee,
      tip: payload.tip,
      total: payload.total,
      status: 'placed',
      placedAt: new Date().toISOString(),
      deliveryAddress: payload.deliveryAddress
    };
    this.orders = [order, ...this.orders];
    return of(order).pipe(delay(800));
  }

  getOrderHistory(): Observable<Order[]> {
    return of([...this.orders]).pipe(delay(300));
  }

  getOrder(id: string): Observable<Order | undefined> {
    return of(this.orders.find(o => o.id === id)).pipe(delay(200));
  }
}
