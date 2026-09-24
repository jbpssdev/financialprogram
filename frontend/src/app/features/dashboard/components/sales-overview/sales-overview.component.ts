import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDollarSign } from '@ng-icons/lucide';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { DashboardSalesResponse } from '../../dashboard.models';
import { formatCurrency, formatQuantity } from '../../dashboard.utils';

@Component({
  selector: 'app-sales-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmCardImports, NgIcon],
  providers: [provideIcons({ lucideDollarSign })],
  template: `
    <section aria-labelledby="sales-section-heading" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 id="sales-section-heading" class="text-lg font-semibold tracking-tight text-foreground">
          Desempenho Comercial de Vendas
        </h2>
        <div class="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Vendas Concluídas: <strong class="text-foreground">{{ sales().salesSummary.completedSalesCount }}</strong></span>
          <span>Canceladas: <strong class="text-foreground">{{ sales().salesSummary.canceledSalesCount }}</strong></span>
          <span>Ticket Médio: <strong class="text-foreground">{{ formatCurrency(sales().salesSummary.averageTicket) }}</strong></span>
        </div>
      </div>

      @if (sales().topProducts.byRevenue.length > 0) {
        <div hlmCard class="overflow-hidden border border-border shadow-2xs" data-testid="table-top-products">
          <div class="px-6 py-4 border-b border-border bg-card/60">
            <h3 class="text-sm font-semibold text-foreground">Produtos Mais Vendidos por Receita</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-muted/40 text-muted-foreground uppercase text-[11px] tracking-wider border-b border-border font-medium">
                <tr>
                  <th class="px-6 py-3">Produto</th>
                  <th class="px-6 py-3 text-right">Qtd Vendida</th>
                  <th class="px-6 py-3 text-right">Receita Total</th>
                  <th class="px-6 py-3 text-right">Custo Total</th>
                  <th class="px-6 py-3 text-right">Lucro Bruto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (p of sales().topProducts.byRevenue; track p.productId) {
                  <tr class="hover:bg-accent/40 transition-colors">
                    <td class="px-6 py-3 font-medium text-foreground">{{ p.name }}</td>
                    <td class="px-6 py-3 text-right font-mono text-muted-foreground">{{ formatQuantity(p.quantitySold, p.unitOfMeasure) }}</td>
                    <td class="px-6 py-3 text-right font-mono font-medium text-foreground">{{ formatCurrency(p.revenue) }}</td>
                    <td class="px-6 py-3 text-right font-mono text-muted-foreground">{{ formatCurrency(p.cogs) }}</td>
                    <td class="px-6 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(p.grossProfit) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <!-- Empty Sales State -->
        <div hlmCard class="p-8 text-center bg-card border-border shadow-2xs" data-testid="empty-sales">
          <ng-icon name="lucideDollarSign" class="size-8 mx-auto text-muted-foreground mb-2" />
          <p class="text-sm font-medium text-foreground">Nenhuma venda registrada neste período.</p>
          <p class="text-xs text-muted-foreground mt-1">Conclua novas vendas no módulo comercial para acompanhar o faturamento.</p>
        </div>
      }
    </section>
  `,
})
export class SalesOverviewComponent {
  readonly sales = input.required<DashboardSalesResponse>();

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatQuantity = formatQuantity;
}
