import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePackage } from '@ng-icons/lucide';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { DashboardInventoryResponse } from '../../dashboard.models';
import { formatCurrency, formatQuantity } from '../../dashboard.utils';

@Component({
  selector: 'app-inventory-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmCardImports, NgIcon],
  providers: [provideIcons({ lucidePackage })],
  template: `
    <div hlmCard class="p-6 bg-card border-border shadow-2xs space-y-4" data-testid="inventory-block">
      <div class="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h3 class="text-base font-semibold text-foreground">Posição Atual de Estoque</h3>
          <p class="text-xs text-muted-foreground">Itens físicos sob custódia e alerta de reposição</p>
        </div>
        <ng-icon name="lucidePackage" class="size-4 text-muted-foreground" />
      </div>

      <div class="grid grid-cols-3 gap-2 py-2">
        <div class="bg-muted/40 p-3 rounded-md text-center">
          <span class="text-[11px] text-muted-foreground block">Produtos Ativos</span>
          <strong class="text-sm font-semibold text-foreground">{{ inventory().activePhysicalProductsCount }}</strong>
        </div>
        <div class="bg-muted/40 p-3 rounded-md text-center">
          <span class="text-[11px] text-muted-foreground block">Estoque Zero</span>
          <strong class="text-sm font-semibold text-rose-600 dark:text-rose-400">{{ inventory().zeroStockCount }}</strong>
        </div>
        <div class="bg-muted/40 p-3 rounded-md text-center">
          <span class="text-[11px] text-muted-foreground block">Valor em Estoque</span>
          <strong class="text-sm font-semibold text-foreground">{{ formatCurrency(inventory().totalStockValue) }}</strong>
        </div>
      </div>

      <!-- Low Stock Items List -->
      @if (inventory().lowStockItems.length > 0 || inventory().zeroStockItems.length > 0) {
        <div class="space-y-2 pt-2">
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Produtos em Nível Crítico (≤ {{ inventory().lowStockThreshold }})
          </h4>
          <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            @for (item of [...inventory().zeroStockItems, ...inventory().lowStockItems]; track item.id) {
              <div class="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                <div>
                  <span class="font-medium text-foreground block">{{ item.name }}</span>
                  <span class="text-[11px] text-muted-foreground">Custo Médio: {{ formatCurrency(item.averageCost) }}</span>
                </div>
                <span
                  class="font-mono font-semibold"
                  [ngClass]="{
                    'text-rose-600 dark:text-rose-400': item.currentStock.startsWith('-') || item.currentStock === '0.000',
                    'text-amber-600 dark:text-amber-400': !item.currentStock.startsWith('-') && item.currentStock !== '0.000'
                  }"
                >
                  {{ formatQuantity(item.currentStock, item.unitOfMeasure) }}
                </span>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded">
          Todos os produtos estão com níveis regulares de estoque.
        </div>
      }
    </div>
  `,
})
export class InventoryOverviewComponent {
  readonly inventory = input.required<DashboardInventoryResponse>();

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatQuantity = formatQuantity;
}
