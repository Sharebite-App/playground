export interface Restaurant {
  id: number;
  name: string;
  cuisine: string[];
  rating: number;
  deliveryFee: number;
  estimatedDeliveryTime: string;
  photo: string;
  street: string;
  isOpen: boolean;
  tags: string[];
}
