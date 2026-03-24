import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { MockApiService } from '../../../core/services/mock-api.service';
import { AllowanceService } from '../../../core/services/allowance.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { Restaurant } from '../../../core/models';

const TAX_RATE = 0.0875;
const DELIVERY_FEE = 1.99;

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyFormatPipe],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss'
})
export class CheckoutPage implements OnInit {
  authService = inject(AuthService);
  cartService = inject(CartService);
  allowanceService = inject(AllowanceService);
  private api = inject(MockApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  placing = signal(false);
  summaryExpanded = signal(true);
  honorCodeAccepted = signal(false);
  showExpenseNote = signal(false);
  expenseNote = signal('');
  restaurant = signal<Restaurant | null>(null);
  selectedExpenseTypeId = signal<number | null>(null);
  tipPercent = signal(15);
  customTip = signal(0);

  deliveryForm = this.fb.group({
    address: ['', Validators.required],
    crossStreet: [''],
    floor: [''],
    instructions: ['']
  });

  paymentForm = this.fb.group({
    cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4} \d{4} \d{4} \d{4}$/)]],
    expiry: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    name: ['', Validators.required]
  });

  subtotal = computed(() => this.cartService.subtotal());
  tax = computed(() => this.subtotal() * TAX_RATE);
  deliveryFee = DELIVERY_FEE;
  tip = computed(() =>
    this.tipPercent() === -1
      ? this.customTip()
      : this.subtotal() * this.tipPercent() / 100
  );
  total = computed(() => this.subtotal() + this.tax() + this.deliveryFee + this.tip());

  allowanceCovered = computed(() => {
    const id = this.selectedExpenseTypeId();
    if (!id) return 0;
    return this.allowanceService.getCovered(id, this.total());
  });

  employeeOwes = computed(() => Math.max(0, this.total() - this.allowanceCovered()));

  canPlaceOrder = computed(() => {
    if (this.placing()) return false;
    if (!this.deliveryForm.value.address?.trim()) return false;
    if (this.selectedExpenseTypeId() && !this.honorCodeAccepted()) return false;
    if (this.employeeOwes() > 0.005 && this.savedCards.length === 0 && this.paymentForm.invalid) return false;
    return true;
  });

  tipOptions = [
    { label: '0%', value: 0 },
    { label: '15%', value: 15 },
    { label: '18%', value: 18 },
    { label: '20%', value: 20 },
    { label: 'Custom', value: -1 }
  ];

  ngOnInit(): void {
    const restaurantId = this.cartService.currentRestaurantId();
    if (restaurantId) {
      this.api.getRestaurant(restaurantId).subscribe(r => {
        if (r) this.restaurant.set(r);
      });
    }
    const defaultAddr = this.savedAddresses[0];
    if (defaultAddr) {
      this.deliveryForm.patchValue({ address: defaultAddr.street });
    }
    // Pre-select first available expense type so allowance section is visible
    const firstAvailable = this.allowanceService.expenseTypes()
      .find(et => this.allowanceService.getRemaining(et.id) > 0);
    if (firstAvailable) {
      this.selectedExpenseTypeId.set(firstAvailable.id);
    }
  }

  get savedAddresses() { return this.authService.currentUser()?.addresses ?? []; }
  get savedCards() { return this.authService.currentUser()?.paymentMethods ?? []; }

  get selectedExpenseTypeLimit(): number {
    const id = this.selectedExpenseTypeId();
    return this.allowanceService.expenseTypes().find(e => e.id === id)?.allowanceAmount ?? 0;
  }

  get selectedExpenseTypeName(): string {
    const id = this.selectedExpenseTypeId();
    return this.allowanceService.expenseTypes().find(e => e.id === id)?.name ?? '';
  }

  selectAddress(street: string): void {
    this.deliveryForm.patchValue({ address: street });
  }

  itemLineTotal(item: { price: number; quantity: number; selectedOptions: { priceAdd: number }[] }): number {
    const optAdd = item.selectedOptions.reduce((s, o) => s + o.priceAdd, 0);
    return (item.price + optAdd) * item.quantity;
  }

  placeOrder(): void {
    if (!this.canPlaceOrder()) {
      this.deliveryForm.markAllAsTouched();
      if (this.employeeOwes() > 0.005) this.paymentForm.markAllAsTouched();
      return;
    }
    this.placing.set(true);
    const restaurantId = this.cartService.currentRestaurantId()!;
    const expenseTypeId = this.selectedExpenseTypeId() ?? undefined;
    const expenseType = expenseTypeId
      ? this.allowanceService.expenseTypes().find(e => e.id === expenseTypeId)
      : undefined;
    const covered = this.allowanceCovered();

    this.api.placeOrder({
      restaurantId,
      restaurantName: this.restaurant()?.name ?? '',
      items: this.cartService.items(),
      subtotal: this.subtotal(),
      tax: this.tax(),
      deliveryFee: this.deliveryFee,
      tip: this.tip(),
      total: this.total(),
      deliveryAddress: this.deliveryForm.value.address!,
      expenseTypeId,
      expenseTypeName: expenseType?.name,
      allowanceCovered: covered || undefined,
      employeeOwes: covered ? this.employeeOwes() : undefined
    }).subscribe(order => {
      if (expenseTypeId && covered > 0) {
        this.allowanceService.recordUsage(expenseTypeId, covered, order.id);
      }
      this.cartService.clear();
      this.router.navigate(['/order-confirmation', order.id]);
    });
  }
}
