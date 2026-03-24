import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockApiService } from '../../../core/services/mock-api.service';
import { Order, OrderStatus } from '../../../core/models';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'placed', label: 'Order Placed', icon: '✅' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'on_the_way', label: 'On the Way', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '🏠' }
];

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, CurrencyFormatPipe],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.scss'
})
export class OrderConfirmation implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(MockApiService);

  order = signal<Order | null>(null);
  statusSteps = STATUS_STEPS;
  estimatedMinutes = Math.floor(Math.random() * 20) + 25;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('orderId')!;
    this.api.getOrder(id).subscribe(o => {
      if (o) this.order.set(o);
    });
  }

  statusIndex(status: OrderStatus): number {
    return STATUS_STEPS.findIndex(s => s.key === status);
  }
}
