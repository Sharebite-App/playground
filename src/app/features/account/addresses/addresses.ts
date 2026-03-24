import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './addresses.html'
})
export class Addresses {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  showForm = signal(false);
  saving = signal(false);

  form = this.fb.group({
    label: ['Home', Validators.required],
    street: ['', Validators.required],
    floor: ['']
  });

  add(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.authService.addAddress(this.form.value as any).subscribe(() => {
      this.saving.set(false);
      this.showForm.set(false);
      this.form.reset({ label: 'Home' });
    });
  }

  delete(id: number): void {
    this.authService.deleteAddress(id).subscribe();
  }
}
