import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Vendas"
        description="Gestão e emissão de vendas e pedidos de clientes."
      />
    </div>
  `,
})
export class SalesComponent {}
