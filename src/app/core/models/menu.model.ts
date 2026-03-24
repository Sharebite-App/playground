export interface MenuItemChoiceOption {
  id: number;
  name: string;
  priceAdd: number;
}

export interface MenuItemChoice {
  id: number;
  title: string;
  required: boolean;
  options: MenuItemChoiceOption[];
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  photo: string;
  choices: MenuItemChoice[];
}

export interface MenuCategory {
  id: number;
  restaurantId: number;
  name: string;
  items: MenuItem[];
}
