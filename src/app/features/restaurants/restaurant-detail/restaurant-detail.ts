import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MockApiService } from '../../../core/services/mock-api.service';
import { Restaurant, MenuCategory, MenuItem } from '../../../core/models';
import { StarRating } from '../../../shared/components/star-rating/star-rating';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { MenuItemModal } from '../menu-item-modal/menu-item-modal';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [StarRating, Spinner, CurrencyFormatPipe],
  templateUrl: './restaurant-detail.html',
  styleUrl: './restaurant-detail.scss'
})
export class RestaurantDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(MockApiService);
  private modal = inject(NgbModal);

  restaurant = signal<Restaurant | null>(null);
  categories = signal<MenuCategory[]>([]);
  loading = signal(true);
  activeCategory = signal(0);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getRestaurant(id).subscribe(r => { if (r) this.restaurant.set(r); });
    this.api.getMenu(id).subscribe(cats => {
      this.categories.set(cats);
      if (cats.length) this.activeCategory.set(cats[0].id);
      this.loading.set(false);
    });
  }

  openItem(item: MenuItem): void {
    const ref = this.modal.open(MenuItemModal, { centered: true, size: 'md' });
    ref.componentInstance.item = item;
    ref.componentInstance.restaurantId = this.restaurant()!.id;
  }

  scrollToCategory(id: number): void {
    this.activeCategory.set(id);
    const el = document.getElementById(`category-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
