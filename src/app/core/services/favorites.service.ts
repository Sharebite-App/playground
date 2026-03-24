import { Injectable, signal, computed } from '@angular/core';
import { Restaurant } from '../models';

// key used to store favorites in localStorage (same pattern as cart)
const STORAGE_KEY = 'app_favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  // storing the full restaurant object so we don't need an extra API call
  // when loading the favorites page - similar to how CartService stores CartItems
  private _favorites = signal<Restaurant[]>(this._loadFromStorage());

  // expose as readonly so components can't modify it directly
  favorites = this._favorites.asReadonly();

  // computed count so the badge in the UI stays in sync automatically
  favoriteCount = computed(() => this._favorites().length);

  // load saved favorites from localStorage on service init
  private _loadFromStorage(): Restaurant[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      // if parsing fails just start fresh
      return [];
    }
  }

  // save current state to localStorage
  private _persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._favorites()));
  }

  addFavorite(restaurant: Restaurant): void {
    // push to the list and persist
    this._favorites().push(restaurant);
    this._persist();
  }

  removeFavorite(restaurantId: number): void {
    // find the index and remove it
    const idx = this._favorites().findIndex(r => r.id === restaurantId);
    if (idx > -1) {
      this._favorites().splice(idx, 1);
    }
    this._persist();
  }

  // check if a restaurant is already in favorites
  isFavorite(restaurantId: number): boolean {
    return this._favorites().some(r => r.id === restaurantId);
  }

  // toggles between adding and removing - used by the heart button
  toggle(restaurant: Restaurant): void {
    if (this.isFavorite(restaurant.id)) {
      this.removeFavorite(restaurant.id);
    } else {
      this.addFavorite(restaurant);
    }
  }

  // clear everything - called from the favorites page "Clear All" button
  clearAll(): void {
    this._favorites.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }
}
