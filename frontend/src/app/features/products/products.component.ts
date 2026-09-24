import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Produtos"
        description="Catálogo de produtos, precificação e parametrização fiscal."
      />
    </div>
  `,
})
export class ProductsComponent {}
