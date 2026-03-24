import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { FavoritesService } from '../../../core/services/favorites.service';
import { Restaurant } from '../../../core/models';

/**
 * Reusable heart button for favoriting a restaurant.
 * Used in RestaurantCard. Emits (favorited) so the parent can react if needed.
 */
@Component({
  selector: 'app-favorite-button',
  standalone: true,
  imports: [],
  templateUrl: './favorite-button.html'
})
export class FavoriteButton implements OnInit {
  @Input({ required: true }) restaurant!: Restaurant;

  // emit the restaurant back up so the parent knows which one was toggled
  @Output() favorited = new EventEmitter<Restaurant>();

  private favoritesService = inject(FavoritesService);

  // local state to drive the filled/outline icon - synced from service on init
  isFavorited = false;

  ngOnInit(): void {
    // check the service to see if this restaurant is already saved
    this.isFavorited = this.favoritesService.isFavorite(this.restaurant.id);
  }

  toggle(event: MouseEvent): void {
    // stop the click from bubbling up to the router link on the card
    event.preventDefault();
    event.stopPropagation();

    this.favoritesService.toggle(this.restaurant);

    // flip local state so the icon updates immediately without waiting for CD
    this.isFavorited = !this.isFavorited;

    // let the parent know
    this.favorited.emit(this.restaurant);
  }
}
