import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideLayers,
  lucidePackage,
  lucidePackageCheck,
  lucidePackageX,
  lucideRefreshCw,
  lucideWrench,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { toast } from '@spartan-ng/helm/sonner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { InventoryListComponent } from './components/inventory-list/inventory-list.component';
import { OpeningBalanceDialogComponent } from './components/opening-balance-dialog/opening-balance-dialog.component';
import { StockAdjustmentDialogComponent } from './components/stock-adjustment-dialog/stock-adjustment-dialog.component';
import { StockMovementsComponent } from './components/stock-movements/stock-movements.component';
import {
  CreateStockAdjustmentDto,
  InventoryProduct,
  OpeningBalanceDto,
} from './inventory.models';
import { InventoryStore } from './inventory.store';

@Component({
  selector: 'app-inventory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    PageHeaderComponent,
    InventoryListComponent,
    StockMovementsComponent,
    StockAdjustmentDialogComponent,
    OpeningBalanceDialogComponent,
    HlmButton,
    NgIcon,
  ],
  providers: [
    InventoryStore,
    provideIcons({
      lucidePackage,
      lucidePackageCheck,
      lucidePackageX,
      lucideWrench,
      lucideLayers,
      lucideRefreshCw,
      lucideAlertCircle,
      lucideX,
    }),
  ],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <app-page-header
        title="Estoque"
        description="Controle de posições, saldo inicial, histórico e ajustes de inventário."
      />

      <!-- Quick Metrics Summary Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3.5 rounded-lg border border-border bg-card shadow-2xs flex items-center gap-3">
          <div class="p-2 rounded-md bg-primary/10 text-primary">
            <ng-icon name="lucideLayers" class="size-4" />
          </div>
          <div>
            <span class="text-xs text-muted-foreground block">Total de Itens</span>
            <span class="text-lg font-bold text-foreground" data-testid="kpi-total-items">
              {{ store.totalCount() }}
            </span>
          </div>
        </div>

        <div class="p-3.5 rounded-lg border border-border bg-card shadow-2xs flex items-center gap-3">
          <div class="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ng-icon name="lucidePackageCheck" class="size-4" />
          </div>
          <div>
            <span class="text-xs text-muted-foreground block">Em Estoque</span>
            <span class="text-lg font-bold text-foreground" data-testid="kpi-in-stock">
              {{ store.inStockCount() }}
            </span>
          </div>
        </div>

        <div class="p-3.5 rounded-lg border border-border bg-card shadow-2xs flex items-center gap-3">
          <div class="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ng-icon name="lucidePackageX" class="size-4" />
          </div>
          <div>
            <span class="text-xs text-muted-foreground block">Estoque Zerado</span>
            <span class="text-lg font-bold text-foreground" data-testid="kpi-out-of-stock">
              {{ store.outOfStockCount() }}
            </span>
          </div>
        </div>

        <div class="p-3.5 rounded-lg border border-border bg-card shadow-2xs flex items-center gap-3">
          <div class="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ng-icon name="lucideWrench" class="size-4" />
          </div>
          <div>
            <span class="text-xs text-muted-foreground block">Serviços</span>
            <span class="text-lg font-bold text-foreground" data-testid="kpi-services">
              {{ store.servicesCount() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Global Error State -->
      @if (store.error(); as err) {
        <div
          class="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between"
          data-testid="inventory-global-error"
        >
          <div class="flex items-center gap-2 text-sm font-medium">
            <ng-icon name="lucideAlertCircle" class="size-4" />
            <span>{{ err }}</span>
          </div>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            class="h-8 text-xs"
            (click)="store.loadInventory()"
          >
            <ng-icon name="lucideRefreshCw" class="size-3.5 mr-1.5" />
            Tentar novamente
          </button>
        </div>
      }

      <!-- Inventory List Component -->
      <app-inventory-list
        [items]="store.filteredItems()"
        [categories]="store.categories()"
        [filters]="store.filters()"
        [loading]="store.loading()"
        (viewMovements)="onViewMovements($event)"
        (openAdjustment)="onOpenAdjustment($event)"
        (openOpeningBalance)="onOpenOpeningBalance($event)"
        (searchChange)="store.setFilterSearch($event)"
        (categoryChange)="store.setFilterCategoryId($event)"
        (typeChange)="store.setFilterType($event)"
        (statusChange)="store.setFilterStockStatus($event)"
        (clearFilters)="store.clearFilters()"
      />

      <!-- ================= MODALS ================= -->

      <!-- 1. Stock Movements History Modal -->
      @if (showMovementsModal() && activeProduct()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          data-testid="modal-movements"
        >
          <div
            class="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <app-stock-movements
              [product]="activeProduct()"
              [movements]="store.movements()"
              [loading]="store.movementsLoading()"
              [error]="store.movementsError()"
              (close)="closeMovementsModal()"
              (retry)="retryMovements()"
            />
          </div>
        </div>
      }

      <!-- 2. Manual Stock Adjustment Dialog Modal -->
      @if (showAdjustmentModal() && activeProduct()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          data-testid="modal-adjustment"
        >
          <div
            class="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <app-stock-adjustment-dialog
              [product]="activeProduct()!"
              [saving]="store.saving()"
              (submitAdjustment)="onSubmitAdjustment($event)"
              (cancel)="closeAdjustmentModal()"
            />
          </div>
        </div>
      }

      <!-- 3. Opening Balance Dialog Modal -->
      @if (showOpeningModal() && activeProduct()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          data-testid="modal-opening-balance"
        >
          <div
            class="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <app-opening-balance-dialog
              [product]="activeProduct()!"
              [saving]="store.saving()"
              (submitOpeningBalance)="onSubmitOpeningBalance($event)"
              (cancel)="closeOpeningModal()"
            />
          </div>
        </div>
      }
    </div>
  `,
})
export class InventoryComponent implements OnInit {
  readonly store = inject(InventoryStore);

  // Modal display signals
  readonly showMovementsModal = signal<boolean>(false);
  readonly showAdjustmentModal = signal<boolean>(false);
  readonly showOpeningModal = signal<boolean>(false);
  readonly activeProduct = signal<InventoryProduct | null>(null);

  ngOnInit(): void {
    this.store.loadInventory();
  }

  onViewMovements(product: InventoryProduct): void {
    this.activeProduct.set(product);
    this.store.selectItem(product);
    this.showMovementsModal.set(true);
  }

  closeMovementsModal(): void {
    this.showMovementsModal.set(false);
    this.activeProduct.set(null);
    this.store.selectItem(null);
  }

  retryMovements(): void {
    const prod = this.activeProduct();
    if (prod) {
      this.store.loadMovements(prod.id);
    }
  }

  onOpenAdjustment(product: InventoryProduct): void {
    this.activeProduct.set(product);
    this.showAdjustmentModal.set(true);
  }

  closeAdjustmentModal(): void {
    this.showAdjustmentModal.set(false);
    this.activeProduct.set(null);
  }

  onSubmitAdjustment(dto: CreateStockAdjustmentDto): void {
    this.store.createAdjustment(dto).subscribe({
      next: () => {
        toast.success('Ajuste de estoque registrado com sucesso.');
        this.closeAdjustmentModal();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Erro ao registrar ajuste de estoque.';
        toast.error(msg);
      },
    });
  }

  onOpenOpeningBalance(product: InventoryProduct): void {
    this.activeProduct.set(product);
    this.showOpeningModal.set(true);
  }

  closeOpeningModal(): void {
    this.showOpeningModal.set(false);
    this.activeProduct.set(null);
  }

  onSubmitOpeningBalance(dto: OpeningBalanceDto): void {
    this.store.setOpeningBalance(dto).subscribe({
      next: () => {
        toast.success('Saldo inicial registrado com sucesso.');
        this.closeOpeningModal();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Erro ao registrar saldo inicial.';
        toast.error(msg);
      },
    });
  }
}
