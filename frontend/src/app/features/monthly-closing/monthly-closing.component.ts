import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-monthly-closing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Fechamento Mensal"
        description="Bloqueio de períodos, conciliação e apuração de resultados contábeis."
      />
    </div>
  `,
})
export class MonthlyClosingComponent {}
