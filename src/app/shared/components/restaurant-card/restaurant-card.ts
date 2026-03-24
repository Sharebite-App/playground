import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Restaurant } from '../../../core/models';
import { StarRating } from '../star-rating/star-rating';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';

@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [RouterLink, StarRating, CurrencyFormatPipe],
  templateUrl: './restaurant-card.html',
  styleUrl: './restaurant-card.scss'
})
export class RestaurantCard {
  @Input({ required: true }) restaurant!: Restaurant;

  get slug(): string {
    return this.restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}
