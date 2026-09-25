import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideAlertTriangle,
  lucideFilter,
  lucideHistory,
  lucideLayers,
  lucidePackage,
  lucidePackagePlus,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import {
  InventoryFilters,
  InventoryProduct,
  StockStatusFilter,
} from '../../inventory.models';
import {
  formatAverageCost,
  formatCurrency,
  formatQuantity,
  getItemTypeLabel,
  getUnitOfMeasureLabel,
  isZeroStock,
} from '../../inventory.utils';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    HlmTableImports,
    HlmButton,
    HlmInput,
    HlmBadge,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideFilter,
      lucideX,
      lucideHistory,
      lucideSlidersHorizontal,
      lucidePackagePlus,
      lucidePackage,
      lucideAlertTriangle,
      lucideLayers,
      lucideAlertCircle,
    }),
  ],
  template: `
    <div class="space-y-4">
      <!-- Filters and Search Toolbar -->
      <div class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <!-- 1. Search Field -->
          <div class="relative">
            <ng-icon
              name="lucideSearch"
              class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <input
              hlmInput
              type="text"
              [ngModel]="filters().search"
              (ngModelChange)="searchChange.emit($event)"
              placeholder="Buscar por produto, categoria..."
              class="pl-9 w-full text-sm"
              data-testid="inventory-search-input"
            />
            @if (filters().search) {
              <button
                type="button"
                (click)="searchChange.emit('')"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <ng-icon name="lucideX" class="size-3.5" />
              </button>
            }
          </div>

          <!-- 2. Category Filter -->
          <div>
            <select
              hlmInput
              [ngModel]="filters().categoryId"
              (ngModelChange)="categoryChange.emit($event)"
              class="w-full text-sm bg-background border-input"
              data-testid="inventory-category-select"
              aria-label="Filtrar por categoria"
            >
              <option value="ALL">Todas as categorias</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>

          <!-- 3. Type Filter -->
          <div>
            <select
              hlmInput
              [ngModel]="filters().type"
              (ngModelChange)="typeChange.emit($event)"
              class="w-full text-sm bg-background border-input"
              data-testid="inventory-type-select"
              aria-label="Filtrar por tipo de item"
            >
              <option value="ALL">Todos os tipos</option>
              <option value="PRODUCT_STOCK">Produto com estoque</option>
              <option value="TOKEN_QUANTITY">Ficha / item por quantidade</option>
              <option value="SERVICE">Serviço (Sem estoque)</option>
            </select>
          </div>

          <!-- 4. Stock Status Filter -->
          <div>
            <select
              hlmInput
              [ngModel]="filters().stockStatus"
              (ngModelChange)="statusChange.emit($event)"
              class="w-full text-sm bg-background border-input"
              data-testid="inventory-status-select"
              aria-label="Filtrar por situação do estoque"
            >
              <option value="ALL">Todas as situações</option>
              <option value="IN_STOCK">Com saldo positivo</option>
              <option value="OUT_OF_STOCK">Estoque zerado</option>
              <option value="SERVICE">Apenas serviços</option>
            </select>
          </div>
        </div>

        @if (hasActiveFilters()) {
          <div class="flex items-center justify-between pt-1 border-t border-border/50 text-xs text-muted-foreground">
            <span>Filtros ativos aplicados</span>
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              (click)="clearFilters.emit()"
              class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              data-testid="btn-clear-filters"
            >
              <ng-icon name="lucideX" class="size-3 mr-1" />
              Limpar filtros
            </button>
          </div>
        }
      </div>

      <!-- Inventory Table Container with Horizontal Scroll for Mobile -->
      <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table hlmTable class="w-full text-left text-sm" data-testid="inventory-table">
            <thead hlmThead class="bg-muted/40 border-b border-border">
              <tr hlmTr>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground">Produto</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground">Categoria</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground">Tipo</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground text-right">Estoque Atual</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground text-right">Custo Médio</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground text-right">Valor em Estoque</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground text-center">Situação</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody hlmTbody class="divide-y divide-border">
              <!-- SKELETON LOADING -->
              @if (loading()) {
                @for (i of [1, 2, 3, 4, 5]; track i) {
                  <tr hlmTr class="animate-pulse">
                    <td hlmTd class="py-3 px-4">
                      <div class="h-4 w-36 bg-muted rounded mb-1"></div>
                      <div class="h-3 w-20 bg-muted/60 rounded"></div>
                    </td>
                    <td hlmTd class="py-3 px-4"><div class="h-4 w-24 bg-muted rounded"></div></td>
                    <td hlmTd class="py-3 px-4"><div class="h-4 w-20 bg-muted rounded"></div></td>
                    <td hlmTd class="py-3 px-4 text-right"><div class="h-4 w-16 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-3 px-4 text-right"><div class="h-4 w-20 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-3 px-4 text-right"><div class="h-4 w-20 bg-muted rounded ml-auto"></div></td>
                    <td hlmTd class="py-3 px-4 text-center"><div class="h-5 w-16 bg-muted rounded mx-auto"></div></td>
                    <td hlmTd class="py-3 px-4 text-right"><div class="h-8 w-24 bg-muted rounded ml-auto"></div></td>
                  </tr>
                }
              } @else if (items().length === 0) {
                <!-- EMPTY STATE -->
                <tr>
                  <td colspan="8" class="py-12 text-center text-muted-foreground" data-testid="inventory-empty-state">
                    <div class="flex flex-col items-center justify-center space-y-2">
                      <ng-icon name="lucidePackage" class="size-8 text-muted-foreground/60" />
                      <p class="font-medium text-foreground">Nenhum item com controle de estoque encontrado.</p>
                      <p class="text-xs text-muted-foreground">
                        Tente ajustar os filtros ou cadastre novos produtos na tela de Produtos.
                      </p>
                    </div>
                  </td>
                </tr>
              } @else {
                <!-- ITEMS ROWS -->
                @for (item of items(); track item.id) {
                  <tr
                    hlmTr
                    class="hover:bg-muted/30 transition-colors"
                    [attr.data-testid]="'inventory-row-' + item.id"
                  >
                    <!-- Produto -->
                    <td hlmTd class="py-3 px-4">
                      <div class="font-medium text-foreground flex items-center gap-1.5">
                        <span>{{ item.name }}</span>
                        @if (!item.isActive) {
                          <span class="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-normal">
                            Inativo
                          </span>
                        }
                      </div>
                      @if (item.description) {
                        <p class="text-xs text-muted-foreground line-clamp-1">
                          {{ item.description }}
                        </p>
                      }
                    </td>

                    <!-- Categoria -->
                    <td hlmTd class="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {{ item.category?.name || 'Sem categoria' }}
                    </td>

                    <!-- Tipo -->
                    <td hlmTd class="py-3 px-4 whitespace-nowrap">
                      <span class="text-xs text-muted-foreground">
                        {{ typeLabel(item.type) }}
                      </span>
                    </td>

                    <!-- Estoque Atual -->
                    <td hlmTd class="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                      @if (item.type === 'SERVICE') {
                        <span class="text-xs text-muted-foreground font-sans">Não se aplica</span>
                      } @else {
                        <span [class.text-amber-600]="isZero(item)" [class.font-semibold]="isZero(item)">
                          {{ formatQty(item.currentStock, unitLabel(item.unitOfMeasure)) }}
                        </span>
                      }
                    </td>

                    <!-- Custo Médio (4 casas) -->
                    <td hlmTd class="py-3 px-4 text-right font-mono text-muted-foreground whitespace-nowrap">
                      @if (item.type === 'SERVICE') {
                        <span class="text-xs text-muted-foreground font-sans">—</span>
                      } @else {
                        {{ formatCost(item.averageCost) }}
                      }
                    </td>

                    <!-- Valor em Estoque -->
                    <td hlmTd class="py-3 px-4 text-right font-mono font-medium text-foreground whitespace-nowrap">
                      @if (item.type === 'SERVICE') {
                        <span class="text-xs text-muted-foreground font-sans">—</span>
                      } @else {
                        {{ formatVal(item.stockValue) }}
                      }
                    </td>

                    <!-- Situação -->
                    <td hlmTd class="py-3 px-4 text-center whitespace-nowrap">
                      @if (item.type === 'SERVICE') {
                        <span hlmBadge variant="outline" class="text-[11px] py-0 text-muted-foreground border-border">
                          Serviço
                        </span>
                      } @else if (isZero(item)) {
                        <span hlmBadge variant="destructive" class="text-[11px] py-0">
                          Zerado
                        </span>
                      } @else {
                        <span hlmBadge variant="default" class="text-[11px] py-0 bg-emerald-600 hover:bg-emerald-700 text-white">
                          Em estoque
                        </span>
                      }
                    </td>

                    <!-- Ações -->
                    <td hlmTd class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1">
                        <!-- Botão Histórico -->
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon"
                          class="size-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          (click)="viewMovements.emit(item)"
                          title="Ver histórico de movimentações"
                          aria-label="Ver histórico de movimentações"
                          [attr.data-testid]="'btn-movements-' + item.id"
                        >
                          <ng-icon name="lucideHistory" class="size-4" />
                        </button>

                        @if (item.type !== 'SERVICE') {
                          <!-- Botão Ajuste Manual -->
                          <button
                            hlmBtn
                            variant="ghost"
                            size="icon"
                            class="size-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            (click)="openAdjustment.emit(item)"
                            title="Ajustar estoque"
                            aria-label="Ajustar estoque"
                            [disabled]="!item.isActive"
                            [attr.data-testid]="'btn-adjust-' + item.id"
                          >
                            <ng-icon name="lucideSlidersHorizontal" class="size-4" />
                          </button>

                          <!-- Botão Saldo Inicial (Implantação) -->
                          <button
                            hlmBtn
                            variant="ghost"
                            size="icon"
                            class="size-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            (click)="openOpeningBalance.emit(item)"
                            title="Registrar saldo inicial"
                            aria-label="Registrar saldo inicial"
                            [attr.data-testid]="'btn-opening-' + item.id"
                          >
                            <ng-icon name="lucidePackagePlus" class="size-4" />
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class InventoryListComponent {
  readonly items = input.required<InventoryProduct[]>();
  readonly categories = input.required<Array<{ id: string; name: string }>>();
  readonly filters = input.required<InventoryFilters>();
  readonly loading = input<boolean>(false);

  // Events
  readonly viewMovements = output<InventoryProduct>();
  readonly openAdjustment = output<InventoryProduct>();
  readonly openOpeningBalance = output<InventoryProduct>();
  readonly searchChange = output<string>();
  readonly categoryChange = output<string>();
  readonly typeChange = output<string>();
  readonly statusChange = output<StockStatusFilter>();
  readonly clearFilters = output<void>();

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return (
      f.search.trim().length > 0 ||
      f.categoryId !== 'ALL' ||
      f.type !== 'ALL' ||
      f.stockStatus !== 'ALL'
    );
  });

  formatQty(qty: string, unit: string): string {
    return formatQuantity(qty, unit);
  }

  formatCost(cost: string): string {
    return formatAverageCost(cost);
  }

  formatVal(val: string): string {
    return formatCurrency(val);
  }

  typeLabel(type: any): string {
    return getItemTypeLabel(type);
  }

  unitLabel(unit: any): string {
    return getUnitOfMeasureLabel(unit);
  }

  isZero(item: InventoryProduct): boolean {
    return isZeroStock(item);
  }
}
