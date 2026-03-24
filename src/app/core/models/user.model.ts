export interface SavedAddress {
  id: number;
  label: string;
  street: string;
  floor?: string;
}

export interface PaymentMethod {
  id: number;
  last4: string;
  brand: string;
  isDefault: boolean;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: SavedAddress[];
  paymentMethods: PaymentMethod[];
}
