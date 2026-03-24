import { Component, OnInit, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockApiService } from '../../../core/services/mock-api.service';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss'
})
export class Favorites implements OnInit {
  constructor(private mockApiService: MockApiService) {}

  favoritesService = inject(FavoritesService);
  private elementRef = inject(ElementRef);

  // the list shown in the template - updated by applyFilters()
  filteredFavorites: any[] = [];

  searchQuery = '';
  sortBy = 'name'; // default sort
  isLoading = true;

  ngOnInit(): void {
    // fetch all restaurants so we can match against saved favorite IDs
    // this also makes sure we always show up-to-date restaurant info
    this.mockApiService.getRestaurants().subscribe(restaurants => {
      this.isLoading = false;

      // get the IDs of everything the user has saved
      const favoriteIds = this.favoritesService.favorites().map((f: any) => f.id);

      // filter the full restaurant list down to just the saved ones
      this.filteredFavorites = restaurants.filter((r: any) => favoriteIds.includes(r.id));
    });
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  onSortChange(sort: string): void {
    this.sortBy = sort;
    this.applyFilters();
  }

  // re-filters and re-sorts the favorites list based on current search + sort state
  applyFilters(): void {
    let results = this.favoritesService.favorites() as any[];

    // apply search filter first
    if (this.searchQuery) {
      results = results.filter(r =>
        r.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // then sort
    if (this.sortBy === 'rating') {
      // sort by highest rating first
      results.slice().sort((a: any, b: any) => b.rating - a.rating);
    } else if (this.sortBy === 'name') {
      results = results.slice().sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    this.filteredFavorites = results;
  }

  clearAll(): void {
    this.favoritesService.clearAll();
    this.filteredFavorites = [];

    // show a success message for 3 seconds then hide it
    // TODO: maybe move this to a toast service later
    const successEl = this.elementRef.nativeElement.querySelector('#clear-success-msg');
    if (successEl) {
      successEl.style.display = 'block';
      setTimeout(() => {
        successEl.style.display = 'none';
      }, 3000);
    }
  }

  // generate url-safe slug from restaurant name - same logic as RestaurantCard
  getSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}
