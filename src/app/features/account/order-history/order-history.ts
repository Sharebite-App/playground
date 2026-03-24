import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MockApiService } from '../../../core/services/mock-api.service';
import { Order } from '../../../core/models';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [RouterLink, CurrencyFormatPipe, Spinner, EmptyState, DatePipe],
  templateUrl: './order-history.html'
})
export class OrderHistory implements OnInit {
  private api = inject(MockApiService);

  orders = signal<Order[]>([]);
  loading = signal(true);
  expandedId = signal<string | null>(null);

  ngOnInit(): void {
    this.api.getOrderHistory().subscribe(orders => {
      this.orders.set(orders);
      this.loading.set(false);
    });
  }

  toggle(id: string): void {
    this.expandedId.update(cur => cur === id ? null : id);
  }

  statusClass(status: string): string {
    return status === 'delivered' ? 'text-success' : status === 'placed' ? 'text-warning' : 'text-primary';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { placed: 'Placed', preparing: 'Preparing', on_the_way: 'On the Way', delivered: 'Delivered' };
    return map[status] ?? status;
  }
}
