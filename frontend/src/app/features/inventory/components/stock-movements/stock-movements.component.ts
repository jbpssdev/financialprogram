import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowDownRight,
  lucideArrowUpRight,
  lucideHistory,
  lucideRefreshCw,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { InventoryProduct, StockMovement } from '../../inventory.models';
import {
  formatAverageCost,
  formatCurrency,
  formatDateTime,
  formatQuantity,
  getStockMovementTypeBadgeClass,
  getStockMovementTypeLabel,
  getUnitOfMeasureLabel,
} from '../../inventory.utils';

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HlmTableImports,
    HlmButton,
    HlmBadge,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideHistory,
      lucideX,
      lucideRefreshCw,
      lucideAlertCircle,
      lucideArrowUpRight,
      lucideArrowDownRight,
    }),
  ],
  template: `
    <div class="space-y-5" data-testid="stock-movements-container">
      <!-- Modal Header -->
      <div class="flex items-start justify-between border-b border-border pb-4">
        <div>
          <div class="flex items-center gap-2">
            <ng-icon name="lucideHistory" class="size-5 text-primary" />
            <h2 class="text-lg font-semibold text-foreground">
              Histórico de Movimentações
            </h2>
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">
            Auditabilidade detalhada de entradas, saídas e alterações de saldo do produto.
          </p>
        </div>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="size-8 text-muted-foreground hover:text-foreground"
          (click)="close.emit()"
          aria-label="Fechar histórico"
          data-testid="btn-close-movements"
        >
          <ng-icon name="lucideX" class="size-4" />
        </button>
      </div>

      <!-- Product Summary Card -->
      @if (product(); as prod) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-border bg-muted/20">
          <div>
            <span class="text-xs text-muted-foreground block">Produto</span>
            <span class="text-sm font-semibold text-foreground line-clamp-1">
              {{ prod.name }}
            </span>
            <span class="text-[11px] text-muted-foreground">
              {{ prod.category?.name || 'Sem categoria' }} • {{ unitLabel(prod.unitOfMeasure) }}
            </span>
          </div>

          <div>
            <span class="text-xs text-muted-foreground block">Estoque Atual</span>
            <span class="text-sm font-mono font-bold text-foreground">
              {{ formatQty(prod.currentStock, unitLabel(prod.unitOfMeasure)) }}
            </span>
          </div>

          <div>
            <span class="text-xs text-muted-foreground block">Custo Médio (CMP)</span>
            <span class="text-sm font-mono font-medium text-foreground">
              {{ formatCost(prod.averageCost) }}
            </span>
          </div>

          <div>
            <span class="text-xs text-muted-foreground block">Valor em Estoque</span>
            <span class="text-sm font-mono font-bold text-foreground">
              {{ formatVal(prod.stockValue) }}
            </span>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between text-sm">
          <div class="flex items-center gap-2">
            <ng-icon name="lucideAlertCircle" class="size-4" />
            <span>{{ error() }}</span>
          </div>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            class="h-7 text-xs"
            (click)="retry.emit()"
          >
            <ng-icon name="lucideRefreshCw" class="size-3 mr-1" />
            Tentar novamente
          </button>
        </div>
      }

      <!-- Movements Table with Horizontal Scroll -->
      <div class="rounded-lg border border-border overflow-hidden">
        <div class="overflow-x-auto max-h-[55vh]">
          <table hlmTable class="w-full text-left text-sm" data-testid="movements-table">
            <thead hlmThead class="bg-muted/50 border-b border-border sticky top-0 z-10 backdrop-blur-xs">
              <tr hlmTr>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">Data</th>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">Tipo</th>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground text-right whitespace-nowrap">Quantidade</th>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground text-right whitespace-nowrap">Custo Unitário</th>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground text-right whitespace-nowrap">Custo Total</th>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground text-right whitespace-nowrap">Saldo Após</th>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground text-right whitespace-nowrap">CMP Após</th>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground text-right whitespace-nowrap">Valor Estoque</th>
                <th hlmTh scope="col" class="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">Origem / Motivo</th>
              </tr>
            </thead>
            <tbody hlmTbody class="divide-y divide-border">
              @if (loading()) {
                @for (i of [1, 2, 3, 4]; track i) {
                  <tr hlmTr class="animate-pulse">
                    <td hlmTd class="py-2.5 px-3"><div class="h-4 w-24 bg-muted rounded"></div></td>
                    <td hlmTd class="py-2.5 px-3"><div class="h-5 w-20 bg-muted rounded"></div></td>
                    <td hlmTd class="py-2.5 px-3 text-right"><div class="h-4 w-14 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-2.5 px-3 text-right"><div class="h-4 w-16 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-2.5 px-3 text-right"><div class="h-4 w-16 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-2.5 px-3 text-right"><div class="h-4 w-14 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-2.5 px-3 text-right"><div class="h-4 w-16 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-2.5 px-3 text-right"><div class="h-4 w-16 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-2.5 px-3"><div class="h-4 w-32 bg-muted rounded"></div></td>
                  </tr>
                }
              } @else if (movements().length === 0) {
                <tr>
                  <td colspan="9" class="py-10 text-center text-muted-foreground" data-testid="movements-empty">
                    <div class="flex flex-col items-center justify-center space-y-1.5">
                      <ng-icon name="lucideHistory" class="size-7 text-muted-foreground/60" />
                      <p class="font-medium text-foreground text-sm">Nenhuma movimentação registrada.</p>
                      <p class="text-xs text-muted-foreground">
                        Este produto ainda não recebeu abertura de saldo, compras, vendas ou ajustes manuais.
                      </p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (mov of movements(); track mov.id) {
                  <tr hlmTr class="hover:bg-muted/20 transition-colors">
                    <!-- Data -->
                    <td hlmTd class="py-2.5 px-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {{ formatTime(mov.movementDate || mov.createdAt) }}
                    </td>

                    <!-- Tipo -->
                    <td hlmTd class="py-2.5 px-3 whitespace-nowrap">
                      <span
                        hlmBadge
                        variant="outline"
                        [class]="'text-[11px] font-normal border ' + typeBadgeClass(mov.type)"
                      >
                        {{ typeLabel(mov.type) }}
                      </span>
                    </td>

                    <!-- Quantidade -->
                    <td hlmTd class="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                      <span [class]="getQuantityColorClass(mov.quantity)">
                        {{ formatQtyWithSign(mov.quantity) }}
                      </span>
                    </td>

                    <!-- Custo Unitário (4 casas) -->
                    <td hlmTd class="py-2.5 px-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {{ formatCost(mov.unitCost) }}
                    </td>

                    <!-- Custo Total -->
                    <td hlmTd class="py-2.5 px-3 text-right font-mono text-xs text-foreground whitespace-nowrap">
                      {{ formatVal(mov.totalCost) }}
                    </td>

                    <!-- Saldo Após -->
                    <td hlmTd class="py-2.5 px-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                      {{ formatQty(mov.balanceAfter) }}
                    </td>

                    <!-- CMP Após (4 casas) -->
                    <td hlmTd class="py-2.5 px-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {{ formatCost(mov.averageCostAfter) }}
                    </td>

                    <!-- Valor Estoque Após -->
                    <td hlmTd class="py-2.5 px-3 text-right font-mono text-xs font-medium text-foreground whitespace-nowrap">
                      {{ formatVal(mov.stockValueAfter) }}
                    </td>

                    <!-- Origem / Motivo -->
                    <td hlmTd class="py-2.5 px-3 text-xs text-muted-foreground max-w-xs truncate">
                      @if (mov.purchaseItem?.purchase?.supplier?.name; as supplier) {
                        <span>Fornecedor: {{ supplier }}</span>
                      } @else if (mov.saleItemId) {
                        <span>Venda realizada</span>
                      } @else {
                        <span>{{ mov.reason || '—' }}</span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
        <span>Histórico auditado. Movimentações são somente leitura.</span>
        <button
          hlmBtn
          variant="outline"
          size="sm"
          (click)="close.emit()"
          data-testid="btn-close-movements-footer"
        >
          Fechar
        </button>
      </div>
    </div>
  `,
})
export class StockMovementsComponent {
  readonly product = input<InventoryProduct | null>(null);
  readonly movements = input.required<StockMovement[]>();
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);

  readonly close = output<void>();
  readonly retry = output<void>();

  formatTime(iso: string): string {
    return formatDateTime(iso);
  }

  formatQty(qty: string, unit?: string): string {
    return formatQuantity(qty, unit);
  }

  formatQtyWithSign(qty: string): string {
    const raw = qty?.trim() ?? '0';
    if (raw.startsWith('-')) {
      return formatQuantity(raw);
    }
    return `+${formatQuantity(raw)}`;
  }

  getQuantityColorClass(qty: string): string {
    const raw = qty?.trim() ?? '0';
    if (raw.startsWith('-')) {
      return 'text-rose-600 dark:text-rose-400';
    }
    return 'text-emerald-600 dark:text-emerald-400';
  }

  formatCost(cost: string): string {
    return formatAverageCost(cost);
  }

  formatVal(val: string): string {
    return formatCurrency(val);
  }

  typeLabel(type: any): string {
    return getStockMovementTypeLabel(type);
  }

  typeBadgeClass(type: any): string {
    return getStockMovementTypeBadgeClass(type);
  }

  unitLabel(unit: any): string {
    return getUnitOfMeasureLabel(unit);
  }
}
