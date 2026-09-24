import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Despesas"
        description="Contas a pagar, liquidações e controle de despesas operacionais."
      />
    </div>
  `,
})
export class ExpensesComponent {}
