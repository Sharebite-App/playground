export interface CartItemOption {
  choiceId: number;
  optionId: number;
  name: string;
  priceAdd: number;
}

export interface CartItem {
  menuItemId: number;
  restaurantId: number;
  name: string;
  price: number;
  quantity: number;
  selectedOptions: CartItemOption[];
  specialInstructions?: string;
}
