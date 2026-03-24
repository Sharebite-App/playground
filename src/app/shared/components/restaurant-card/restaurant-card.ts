import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Restaurant } from '../../../core/models';
import { StarRating } from '../star-rating/star-rating';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { FavoriteButton } from '../favorite-button/favorite-button';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [RouterLink, StarRating, CurrencyFormatPipe, FavoriteButton],
  templateUrl: './restaurant-card.html',
  styleUrl: './restaurant-card.scss'
})
export class RestaurantCard {
  @Input({ required: true }) restaurant!: Restaurant;

  private favoritesService = inject(FavoritesService);

  get slug(): string {
    return this.restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // called when the FavoriteButton emits - update the service with the new state
  onFavorited(restaurant: Restaurant): void {
    this.favoritesService.toggle(restaurant);
  }
}
