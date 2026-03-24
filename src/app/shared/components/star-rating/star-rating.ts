import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  template: `
    <span class="star-rating">
      @for (star of stars; track $index) {
        <span [class.filled]="star <= fullStars" [class.half]="star === halfStar" class="star">★</span>
      }
      <span class="rating-value ms-1">{{ rating.toFixed(1) }}</span>
    </span>
  `,
  styles: [`
    .star { color: #ddd; font-size: 0.95rem; }
    .star.filled { color: #f5a623; }
    .star.half { color: #f5a623; opacity: 0.6; }
    .rating-value { font-size: 0.85rem; color: #555; }
  `]
})
export class StarRating {
  @Input() rating = 0;
  stars = [1, 2, 3, 4, 5];
  get fullStars(): number { return Math.floor(this.rating); }
  get halfStar(): number | null { return this.rating % 1 >= 0.5 ? Math.ceil(this.rating) : null; }
}
