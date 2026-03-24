import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="input-group search-bar">
      <span class="input-group-text bg-white border-end-0">
        <i class="bi bi-search text-muted"></i>
      </span>
      <input
        type="text"
        class="form-control border-start-0 ps-0"
        [placeholder]="placeholder"
        [formControl]="control"
      />
      @if (control.value) {
        <button class="btn btn-outline-secondary border-start-0" type="button" (click)="clear()">
          <i class="bi bi-x"></i>
        </button>
      }
    </div>
  `,
  styles: [`
    .search-bar .form-control:focus { box-shadow: none; border-color: #ced4da; }
    .search-bar .input-group-text { border-color: #ced4da; }
  `]
})
export class SearchBar implements OnInit, OnDestroy {
  @Input() placeholder = 'Search...';
  @Output() search = new EventEmitter<string>();

  control = new FormControl('');
  private sub!: Subscription;

  ngOnInit(): void {
    this.sub = this.control.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(val => this.search.emit(val ?? ''));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  clear(): void {
    this.control.setValue('');
    this.search.emit('');
  }
}
