import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Dashboard"
        description="Visão geral e acompanhamento das operações financeiras e contábeis."
      />
    </div>
  `,
})
export class DashboardComponent {}
