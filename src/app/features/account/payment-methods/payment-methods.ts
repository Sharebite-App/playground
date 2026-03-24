import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './payment-methods.html'
})
export class PaymentMethods {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  showForm = signal(false);
  saving = signal(false);

  form = this.fb.group({
    last4: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    brand: ['Visa', Validators.required],
    isDefault: [false]
  });

  add(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.authService.addPaymentMethod(this.form.value as any).subscribe(() => {
      this.saving.set(false);
      this.showForm.set(false);
      this.form.reset({ brand: 'Visa', isDefault: false });
    });
  }

  delete(id: number): void {
    this.authService.deletePaymentMethod(id).subscribe();
  }

  setDefault(id: number): void {
    this.authService.setDefaultPaymentMethod(id).subscribe();
  }
}
