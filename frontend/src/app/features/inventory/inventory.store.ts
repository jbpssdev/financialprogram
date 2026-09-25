import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  CreateStockAdjustmentDto,
  InventoryFilters,
  InventoryProduct,
  OpeningBalanceDto,
  OpeningBalanceResponse,
  StockAdjustmentResponse,
  StockMovement,
  StockStatusFilter,
} from './inventory.models';
import { InventoryService } from './inventory.service';
import { isZeroStock } from './inventory.utils';

@Injectable()
export class InventoryStore {
  private readonly inventoryService = inject(InventoryService);

  // Core state signals
  readonly items = signal<InventoryProduct[]>([]);
  readonly selectedItem = signal<InventoryProduct | null>(null);
  readonly movements = signal<StockMovement[]>([]);

  // Status signals
  readonly loading = signal<boolean>(false);
  readonly movementsLoading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly movementsError = signal<string | null>(null);
  readonly initialized = signal<boolean>(false);

  // Filter signals
  readonly filterSearch = signal<string>('');
  readonly filterCategoryId = signal<string>('ALL');
  readonly filterType = signal<string>('ALL');
  readonly filterStockStatus = signal<StockStatusFilter>('ALL');

  // Computed signals
  readonly categories = computed(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const item of this.items()) {
      if (item.category) {
        map.set(item.category.id, { id: item.category.id, name: item.category.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly totalCount = computed(() => this.items().length);

  readonly inStockCount = computed(
    () => this.items().filter((p) => p.type !== 'SERVICE' && !isZeroStock(p)).length,
  );

  readonly outOfStockCount = computed(
    () => this.items().filter((p) => p.type !== 'SERVICE' && isZeroStock(p)).length,
  );

  readonly servicesCount = computed(
    () => this.items().filter((p) => p.type === 'SERVICE').length,
  );

  readonly filters = computed<InventoryFilters>(() => ({
    search: this.filterSearch(),
    categoryId: this.filterCategoryId(),
    type: this.filterType(),
    stockStatus: this.filterStockStatus(),
  }));

  readonly filteredItems = computed(() => {
    const list = this.items();
    const search = this.filterSearch().trim().toLowerCase();
    const catId = this.filterCategoryId();
    const type = this.filterType();
    const status = this.filterStockStatus();

    return list.filter((item) => {
      // 1. Search (name, category, description)
      if (search) {
        const nameMatch = item.name.toLowerCase().includes(search);
        const descMatch = item.description ? item.description.toLowerCase().includes(search) : false;
        const catMatch = item.category ? item.category.name.toLowerCase().includes(search) : false;
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      // 2. Category
      if (catId !== 'ALL' && item.categoryId !== catId) {
        return false;
      }

      // 3. Type
      if (type !== 'ALL' && item.type !== type) {
        return false;
      }

      // 4. Stock status
      if (status === 'IN_STOCK') {
        if (item.type === 'SERVICE' || isZeroStock(item)) return false;
      } else if (status === 'OUT_OF_STOCK') {
        if (item.type === 'SERVICE' || !isZeroStock(item)) return false;
      } else if (status === 'SERVICE') {
        if (item.type !== 'SERVICE') return false;
      }

      return true;
    });
  });

  // Actions
  loadInventory(): void {
    this.loading.set(true);
    this.error.set(null);

    this.inventoryService
      .getInventoryOverview()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.initialized.set(true);

          // Refresh selectedItem if one was previously selected
          const currentSelected = this.selectedItem();
          if (currentSelected) {
            const updated = items.find((p) => p.id === currentSelected.id);
            if (updated) {
              this.selectedItem.set(updated);
            }
          }
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erro ao carregar posições de estoque.';
          this.error.set(msg);
        },
      });
  }

  loadMovements(productId: string): void {
    this.movementsLoading.set(true);
    this.movementsError.set(null);

    this.inventoryService
      .getProductMovements(productId)
      .pipe(finalize(() => this.movementsLoading.set(false)))
      .subscribe({
        next: (movements) => {
          this.movements.set(movements);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erro ao carregar histórico de movimentações.';
          this.movementsError.set(msg);
        },
      });
  }

  selectItem(item: InventoryProduct | null): void {
    this.selectedItem.set(item);
    if (item) {
      this.loadMovements(item.id);
    } else {
      this.movements.set([]);
      this.movementsError.set(null);
    }
  }

  setOpeningBalance(dto: OpeningBalanceDto): Observable<OpeningBalanceResponse> {
    this.saving.set(true);
    return this.inventoryService.setOpeningBalance(dto).pipe(
      tap((res) => {
        // Update product in list
        this.items.update((current) =>
          current.map((item) => (item.id === res.product.id ? res.product : item)),
        );
        // If current product is selected, update selectedItem & movements
        if (this.selectedItem()?.id === res.product.id) {
          this.selectedItem.set(res.product);
          this.movements.update((current) => [res.movement, ...current]);
        }
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  createAdjustment(dto: CreateStockAdjustmentDto): Observable<StockAdjustmentResponse> {
    this.saving.set(true);
    return this.inventoryService.createAdjustment(dto).pipe(
      tap((res) => {
        // Update product in list
        this.items.update((current) =>
          current.map((item) => (item.id === res.product.id ? res.product : item)),
        );
        // If current product is selected, update selectedItem & movements
        if (this.selectedItem()?.id === res.product.id) {
          this.selectedItem.set(res.product);
          this.movements.update((current) => [res.movement, ...current]);
        }
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  // Filter setters
  setFilterSearch(search: string): void {
    this.filterSearch.set(search);
  }

  setFilterCategoryId(categoryId: string): void {
    this.filterCategoryId.set(categoryId);
  }

  setFilterType(type: string): void {
    this.filterType.set(type);
  }

  setFilterStockStatus(status: StockStatusFilter): void {
    this.filterStockStatus.set(status);
  }

  clearFilters(): void {
    this.filterSearch.set('');
    this.filterCategoryId.set('ALL');
    this.filterType.set('ALL');
    this.filterStockStatus.set('ALL');
  }
}
