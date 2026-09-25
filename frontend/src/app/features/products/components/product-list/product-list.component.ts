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
  lucideDollarSign,
  lucideFilter,
  lucidePackage,
  lucidePencil,
  lucidePlus,
  lucidePower,
  lucideSearch,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import {
  Category,
  ItemType,
  Product,
  ProductFilters,
} from '../../products.models';
import {
  ITEM_TYPE_OPTIONS,
  formatCurrency,
  formatAverageCost,
  getUnitOfMeasureLabel,
  formatQuantity,
  getItemTypeLabel,
} from '../../products.utils';

@Component({
  selector: 'app-product-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    HlmTableImports,
    HlmButton,
    HlmInput,
    HlmBadge,
    HlmSkeleton,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideFilter,
      lucideX,
      lucidePlus,
      lucidePencil,
      lucideDollarSign,
      lucidePower,
      lucidePackage,
      lucideAlertCircle,
    }),
  ],
  template: `
    <div class="space-y-4 min-w-0 max-w-full" data-testid="product-list-container">

      <!-- Toolbar Filters -->
      <div class="p-3.5 rounded-lg border border-border bg-card shadow-xs space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <!-- Search input -->
          <div class="relative">
            <ng-icon
              name="lucideSearch"
              class="size-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none"
            />
            <input
              hlmInput
              [ngModel]="filters().search"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Buscar por nome ou descrição..."
              class="pl-9 text-xs w-full"
              data-testid="input-filter-search"
            />
          </div>

          <!-- Category filter -->
          <div>
            <select
              [ngModel]="filters().categoryId"
              (ngModelChange)="onCategoryChange($event)"
              class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="select-filter-category"
            >
              <option value="ALL">Todas as Categorias</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>

          <!-- Type filter -->
          <div>
            <select
              [ngModel]="filters().type"
              (ngModelChange)="onTypeChange($event)"
              class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="select-filter-type"
            >
              <option value="ALL">Todos os Tipos</option>
              @for (opt of itemTypes; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>

          <!-- Status filter -->
          <div>
            <select
              [ngModel]="filters().status"
              (ngModelChange)="onStatusChange($event)"
              class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="select-filter-status"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Somente Ativos</option>
              <option value="INACTIVE">Somente Inativos</option>
            </select>
          </div>
        </div>

        @if (hasActiveFilters()) {
          <div class="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
            <span class="text-muted-foreground text-[11px]">
              Filtros ativos aplicados
            </span>
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              (click)="clearFilters.emit()"
              class="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              data-testid="btn-clear-filters"
            >
              <ng-icon name="lucideX" class="size-3" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        }
      </div>

      <!-- Main Table / Skeletons / Empty States -->
      <div class="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        @if (loading()) {
          <!-- Skeleton Loading -->
          <div class="p-4 space-y-3" data-testid="table-loading-skeletons">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div class="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
                <div class="space-y-1.5 flex-1">
                  <hlm-skeleton class="h-4 w-48" />
                  <hlm-skeleton class="h-3 w-28" />
                </div>
                <hlm-skeleton class="h-4 w-20" />
                <hlm-skeleton class="h-4 w-16" />
                <hlm-skeleton class="h-4 w-20" />
                <hlm-skeleton class="h-7 w-24" />
              </div>
            }
          </div>
        } @else if (products().length === 0) {
          <!-- Empty State -->
          <div class="py-12 px-4 text-center space-y-3" data-testid="table-empty-state">
            <div class="mx-auto size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground">
              <ng-icon name="lucidePackage" class="size-6" />
            </div>
            @if (hasActiveFilters()) {
              <div class="space-y-1 max-w-sm mx-auto">
                <p class="text-sm font-semibold text-foreground">Nenhum produto encontrado</p>
                <p class="text-xs text-muted-foreground">
                  Nenhum item corresponde aos critérios de pesquisa e filtros selecionados.
                </p>
              </div>
              <button
                hlmBtn
                variant="outline"
                size="sm"
                (click)="clearFilters.emit()"
                class="gap-1.5 mt-2"
                data-testid="btn-empty-clear-filters"
              >
                <ng-icon name="lucideX" class="size-3.5" />
                <span>Limpar Filtros</span>
              </button>
            } @else {
              <div class="space-y-1 max-w-sm mx-auto">
                <p class="text-sm font-semibold text-foreground">Nenhum produto cadastrado</p>
                <p class="text-xs text-muted-foreground">
                  Comece cadastrando seus produtos ou serviços para gerenciar estoques e vendas.
                </p>
              </div>
              <button
                hlmBtn
                size="sm"
                (click)="createProduct.emit()"
                class="gap-1.5 mt-2"
                data-testid="btn-empty-create-product"
              >
                <ng-icon name="lucidePlus" class="size-3.5" />
                <span>Cadastrar Primeiro Produto</span>
              </button>
            }
          </div>
        } @else {
          <!-- Table -->
          <div class="overflow-x-auto">
            <table hlmTable class="w-full text-xs" data-testid="table-products">
              <thead hlmTHead>
                <tr hlmTr class="bg-muted/30">
                  <th hlmTh class="font-semibold text-muted-foreground py-3 pl-4">Produto</th>
                  <th hlmTh class="font-semibold text-muted-foreground py-3">Tipo / Unidade</th>
                  <th hlmTh class="font-semibold text-muted-foreground py-3 text-right">Estoque</th>
                  <th hlmTh class="font-semibold text-muted-foreground py-3 text-right">Custo Médio</th>
                  <th hlmTh class="font-semibold text-muted-foreground py-3 text-right">Preço de Venda</th>
                  <th hlmTh class="font-semibold text-muted-foreground py-3 text-center" title="Estimativa baseada no custo médio atual; não representa margem de vendas">Margem estimada</th>
                  <th hlmTh class="font-semibold text-muted-foreground py-3 text-center">Status</th>
                  <th hlmTh class="font-semibold text-muted-foreground py-3 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody hlmTBody class="divide-y divide-border/60">
                @for (prod of products(); track prod.id) {
                  <tr hlmTr class="hover:bg-muted/20 transition-colors" [attr.data-testid]="'row-product-' + prod.id">
                    <!-- Produto & Categoria -->
                    <td hlmTd class="py-3 pl-4">
                      <div class="space-y-0.5">
                        <div class="font-medium text-foreground text-sm flex items-center gap-2">
                          <span data-testid="product-name">{{ prod.name }}</span>
                          @if (!prod.isActive) {
                            <span hlmBadge variant="outline" class="text-[10px] text-muted-foreground border-dashed">
                              Inativo
                            </span>
                          }
                        </div>
                        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span class="inline-block px-1.5 py-0.5 rounded bg-muted font-medium text-[10px]">
                            {{ prod.category?.name || 'Sem Categoria' }} {{ prod.category?.isActive === false ? '(Inativa)' : '' }}
                          </span>
                          @if (prod.description) {
                            <span>•</span>
                            <span class="truncate max-w-xs" [title]="prod.description">
                              {{ prod.description }}
                            </span>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- Tipo & Unidade -->
                    <td hlmTd class="py-3 text-muted-foreground">
                      <div class="space-y-0.5">
                        <span class="font-medium text-foreground block">
                          {{ getItemTypeShort(prod.type) }}
                        </span>
                        <span class="text-[11px] font-mono">
                          {{ unitLabel(prod.unitOfMeasure) }}
                        </span>
                      </div>
                    </td>

                    <!-- Estoque -->
                    <td hlmTd class="py-3 text-right font-mono">
                      @if (prod.type === 'SERVICE') {
                        <span class="text-muted-foreground text-[11px] italic" title="Serviço não estocável">
                          N/A
                        </span>
                      } @else {
                        <span
                          class="font-medium"
                          [ngClass]="{
                            'text-amber-600 dark:text-amber-400': isNonPositiveStock(prod.currentStock)
                          }"
                        >
                          {{ formatQty(prod.currentStock) }}
                        </span>
                      }
                    </td>

                    <!-- Custo Médio -->
                    <td hlmTd class="py-3 text-right font-mono text-muted-foreground">
                      {{ formatCost(prod.averageCost) }}
                    </td>

                    <!-- Preço de Venda -->
                    <td hlmTd class="py-3 text-right font-mono font-semibold text-foreground">
                      {{ formatMoney(prod.currentPrice) }}
                    </td>

                    <!-- Margem -->
                    <td hlmTd class="py-3 text-center">
                      @if (getMargin(prod) !== null) {
                        <span
                          class="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium"
                          [ngClass]="{
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': getMargin(prod)! > 0,
                            'bg-rose-500/10 text-rose-600 dark:text-rose-400': getMargin(prod)! < 0,
                            'bg-muted text-muted-foreground': getMargin(prod)! === 0
                          }"
                        >
                          {{ getMargin(prod)!.toFixed(1) }}%
                        </span>
                      } @else {
                        <span class="text-muted-foreground text-[11px]">-</span>
                      }
                    </td>

                    <!-- Status -->
                    <td hlmTd class="py-3 text-center">
                      @if (prod.isActive) {
                        <span hlmBadge class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]">
                          Ativo
                        </span>
                      } @else {
                        <span hlmBadge variant="secondary" class="text-muted-foreground text-[10px]">
                          Inativo
                        </span>
                      }
                    </td>

                    <!-- Ações -->
                    <td hlmTd class="py-3 pr-4 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <!-- Alterar Preço -->
                        <button
                          hlmBtn
                          variant="ghost"
                          size="sm"
                          (click)="changePrice.emit(prod)"
                          class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Alterar Preço"
                          [attr.data-testid]="'btn-price-' + prod.id"
                        >
                          <ng-icon name="lucideDollarSign" class="size-4" />
                          <span class="sr-only">Alterar Preço</span>
                        </button>

                        <!-- Editar -->
                        <button
                          hlmBtn
                          variant="ghost"
                          size="sm"
                          (click)="editProduct.emit(prod)"
                          class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Editar Produto"
                          [attr.data-testid]="'btn-edit-' + prod.id"
                        >
                          <ng-icon name="lucidePencil" class="size-3.5" />
                          <span class="sr-only">Editar Produto</span>
                        </button>

                        <!-- Ativar/Inativar -->
                        <button
                          hlmBtn
                          variant="ghost"
                          size="sm"
                          (click)="toggleStatus.emit(prod)"
                          class="h-8 w-8 p-0"
                          [ngClass]="{
                            'text-muted-foreground hover:text-rose-600': prod.isActive,
                            'text-muted-foreground hover:text-emerald-600': !prod.isActive
                          }"
                          [title]="prod.isActive ? 'Inativar Produto' : 'Ativar Produto'"
                          [attr.data-testid]="'btn-toggle-' + prod.id"
                        >
                          <ng-icon name="lucidePower" class="size-3.5" />
                          <span class="sr-only">{{ prod.isActive ? 'Inativar' : 'Ativar' }}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProductListComponent {
  readonly products = input<Product[]>([]);
  readonly categories = input<Category[]>([]);
  readonly loading = input<boolean>(false);
  readonly filters = input<ProductFilters>({
    search: '',
    categoryId: 'ALL',
    type: 'ALL',
    status: 'ALL',
  });

  readonly filterChange = output<Partial<ProductFilters>>();
  readonly clearFilters = output<void>();
  readonly editProduct = output<Product>();
  readonly changePrice = output<Product>();
  readonly toggleStatus = output<Product>();
  readonly createProduct = output<void>();

  readonly itemTypes = ITEM_TYPE_OPTIONS;
  readonly unitLabel = getUnitOfMeasureLabel;
  readonly formatCost = formatAverageCost;

  isNonPositiveStock(value: string | number): boolean {
    return /^-/.test(String(value)) || /^0+(?:\.0+)?$/.test(String(value));
  }

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return (
      (f.search?.trim().length ?? 0) > 0 ||
      (f.categoryId && f.categoryId !== 'ALL') ||
      (f.type && f.type !== 'ALL') ||
      (f.status && f.status !== 'ALL')
    );
  });

  formatMoney(val: string | number): string {
    return formatCurrency(val);
  }

  formatQty(val: string | number): string {
    return formatQuantity(val);
  }

  getItemTypeShort(type: ItemType): string {
    return getItemTypeLabel(type);
  }

  getMargin(prod: Product): number | null {
    const price = Number(prod.currentPrice);
    const cost = Number(prod.averageCost);
    if (price <= 0) return null;
    return ((price - cost) / price) * 100;
  }

  onSearchChange(search: string): void {
    this.filterChange.emit({ search });
  }

  onCategoryChange(categoryId: string): void {
    this.filterChange.emit({ categoryId });
  }

  onTypeChange(type: ItemType | 'ALL'): void {
    this.filterChange.emit({ type });
  }

  onStatusChange(status: 'ALL' | 'ACTIVE' | 'INACTIVE'): void {
    this.filterChange.emit({ status });
  }
}
