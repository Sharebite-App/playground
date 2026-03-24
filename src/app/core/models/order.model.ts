import { CartItem } from './cart.model';

export type OrderStatus = 'placed' | 'preparing' | 'on_the_way' | 'delivered';

export interface Order {
  id: string;
  restaurantId: number;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  deliveryAddress: string;
  expenseTypeId?: number;
  expenseTypeName?: string;
  allowanceCovered?: number;
  employeeOwes?: number;
}

export interface PlaceOrderPayload {
  restaurantId: number;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
  deliveryAddress: string;
  expenseTypeId?: number;
  expenseTypeName?: string;
  allowanceCovered?: number;
  employeeOwes?: number;
}
