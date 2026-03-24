import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" [class]="sizeClass" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `
})
export class Spinner {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get sizeClass(): string {
    return this.size === 'sm' ? 'spinner-border-sm' : this.size === 'lg' ? 'spinner-border-lg' : '';
  }
}
