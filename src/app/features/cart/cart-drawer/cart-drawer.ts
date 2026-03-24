import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [RouterLink, CurrencyFormatPipe],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss'
})
export class CartDrawer {
  cartService = inject(CartService);

  get deliveryFee(): number { return this.cartService.items().length ? 1.99 : 0; }
  get tax(): number { return this.cartService.subtotal() * 0.0875; }
  get total(): number { return this.cartService.subtotal() + this.deliveryFee + this.tax; }

  itemLineTotal(item: { price: number; quantity: number; selectedOptions: { priceAdd: number }[] }): number {
    const optAdd = item.selectedOptions.reduce((s, o) => s + o.priceAdd, 0);
    return (item.price + optAdd) * item.quantity;
  }

  optionsSummary(options: { name: string }[]): string {
    return options.map(o => o.name).join(', ');
  }
}
