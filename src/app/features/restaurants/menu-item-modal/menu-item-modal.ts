import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CartService } from '../../../core/services/cart.service';
import { MenuItem, CartItem } from '../../../core/models';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-menu-item-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyFormatPipe],
  templateUrl: './menu-item-modal.html',
  styleUrl: './menu-item-modal.scss'
})
export class MenuItemModal implements OnInit {
  @Input({ required: true }) item!: MenuItem;
  @Input({ required: true }) restaurantId!: number;

  activeModal = inject(NgbActiveModal);
  private cartService = inject(CartService);
  private fb = inject(FormBuilder);

  form!: FormGroup;
  quantity = signal(1);

  get itemTotal(): number {
    const optionsAdd = this.item.choices.reduce((sum, choice) => {
      const val = this.form?.get(choice.id.toString())?.value;
      if (!val) return sum;
      if (Array.isArray(val)) {
        return sum + val.reduce((s: number, optId: number) => {
          const opt = choice.options.find(o => o.id === optId);
          return s + (opt?.priceAdd ?? 0);
        }, 0);
      }
      const opt = choice.options.find(o => o.id === Number(val));
      return sum + (opt?.priceAdd ?? 0);
    }, 0);
    return (this.item.price + optionsAdd) * this.quantity();
  }

  ngOnInit(): void {
    const controls: Record<string, unknown> = {};
    for (const choice of this.item.choices) {
      controls[choice.id.toString()] = [choice.required && choice.options[0] ? choice.options[0].id : null];
    }
    this.form = this.fb.group(controls);
  }

  showClearConfirm = signal(false);
  private pendingCartItem: CartItem | null = null;

  get conflictingRestaurantId(): number | null {
    const current = this.cartService.currentRestaurantId();
    return current && current !== this.restaurantId ? current : null;
  }

  addToCart(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const selectedOptions: CartItem['selectedOptions'] = [];
    for (const choice of this.item.choices) {
      const val = this.form.get(choice.id.toString())?.value;
      if (!val) continue;
      if (Array.isArray(val)) {
        for (const optId of val) {
          const opt = choice.options.find(o => o.id === optId);
          if (opt) selectedOptions.push({ choiceId: choice.id, optionId: opt.id, name: opt.name, priceAdd: opt.priceAdd });
        }
      } else {
        const opt = choice.options.find(o => o.id === Number(val));
        if (opt) selectedOptions.push({ choiceId: choice.id, optionId: opt.id, name: opt.name, priceAdd: opt.priceAdd });
      }
    }
    const cartItem: CartItem = {
      menuItemId: this.item.id,
      restaurantId: this.restaurantId,
      name: this.item.name,
      price: this.item.price,
      quantity: this.quantity(),
      selectedOptions
    };

    if (this.conflictingRestaurantId) {
      this.pendingCartItem = cartItem;
      this.showClearConfirm.set(true);
      return;
    }

    this.doAddToCart(cartItem);
  }

  confirmClearAndAdd(): void {
    if (!this.pendingCartItem) return;
    this.cartService.clear();
    this.doAddToCart(this.pendingCartItem);
  }

  cancelClear(): void {
    this.pendingCartItem = null;
    this.showClearConfirm.set(false);
  }

  private doAddToCart(cartItem: CartItem): void {
    this.cartService.addItem(cartItem);
    this.cartService.openDrawer();
    this.activeModal.close();
  }
}
