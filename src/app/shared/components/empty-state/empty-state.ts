import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="text-center py-5 text-muted">
      <div class="fs-1 mb-3">{{ icon }}</div>
      <p class="fs-5">{{ message }}</p>
    </div>
  `
})
export class EmptyState {
  @Input() message = 'Nothing here yet.';
  @Input() icon = '🍽️';
}
