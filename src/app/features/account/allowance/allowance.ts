import { Component, inject } from '@angular/core';
import { AllowanceService } from '../../../core/services/allowance.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-allowance',
  standalone: true,
  imports: [CurrencyFormatPipe],
  templateUrl: './allowance.html'
})
export class Allowance {
  allowanceService = inject(AllowanceService);

  usedPercent(expenseTypeId: number, allowanceAmount: number): number {
    const used = this.allowanceService.getUsedAmount(expenseTypeId);
    return Math.min(100, Math.round((used / allowanceAmount) * 100));
  }
}
