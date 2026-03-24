import { Component, inject, signal, OnInit } from '@angular/core';
import { MockApiService } from '../../../core/services/mock-api.service';
import { Restaurant } from '../../../core/models';
import { RestaurantCard } from '../../../shared/components/restaurant-card/restaurant-card';
import { SearchBar } from '../../../shared/components/search-bar/search-bar';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

const CUISINES = ['All', 'American', 'Pizza', 'Ramen', 'Salads', 'Mexican', 'Japanese', 'Sandwiches', 'Middle Eastern'];
type SortKey = 'rating' | 'deliveryTime' | 'deliveryFee';

@Component({
  selector: 'app-restaurants-list',
  standalone: true,
  imports: [RestaurantCard, SearchBar, Spinner, EmptyState],
  templateUrl: './restaurants-list.html',
  styleUrl: './restaurants-list.scss'
})
export class RestaurantsList implements OnInit {
  private api = inject(MockApiService);

  allRestaurants = signal<Restaurant[]>([]);
  filtered = signal<Restaurant[]>([]);
  loading = signal(true);

  cuisines = CUISINES;
  selectedCuisine = signal('All');
  sortBy = signal<SortKey>('rating');
  searchQuery = signal('');

  ngOnInit(): void {
    this.api.getRestaurants().subscribe(list => {
      this.allRestaurants.set(list);
      this.applyFilters();
      this.loading.set(false);
    });
  }

  onSearch(q: string): void {
    this.searchQuery.set(q);
    this.applyFilters();
  }

  selectCuisine(c: string): void {
    this.selectedCuisine.set(c);
    this.applyFilters();
  }

  setSort(key: SortKey): void {
    this.sortBy.set(key);
    this.applyFilters();
  }

  private applyFilters(): void {
    let list = this.allRestaurants();
    const q = this.searchQuery().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.cuisine.some(c => c.toLowerCase().includes(q))
      );
    }
    const cuisine = this.selectedCuisine();
    if (cuisine !== 'All') {
      list = list.filter(r => r.cuisine.includes(cuisine));
    }
    const sort = this.sortBy();
    list = [...list].sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'deliveryFee') return a.deliveryFee - b.deliveryFee;
      if (sort === 'deliveryTime') return a.estimatedDeliveryTime.localeCompare(b.estimatedDeliveryTime);
      return 0;
    });
    this.filtered.set(list);
  }
}
