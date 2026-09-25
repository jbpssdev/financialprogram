import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideBriefcase,
  lucideCheckCircle2,
  lucideFolderTree,
  lucideLayers,
  lucidePackage,
  lucidePlus,
  lucideRefreshCw,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { toast } from '@spartan-ng/helm/sonner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { CategoryManagerComponent } from './components/category-manager/category-manager.component';
import { PriceDialogComponent } from './components/price-dialog/price-dialog.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import {
  Category,
  CreateCategoryDto,
  CreateProductDto,
  Product,
  ProductFilters,
  UpdateCategoryDto,
  UpdateProductDto,
} from './products.models';

import { ProductsStore } from './products.store';

@Component({
  selector: 'app-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    PageHeaderComponent,
    ProductListComponent,
    ProductFormComponent,
    PriceDialogComponent,
    CategoryManagerComponent,
    HlmCardImports,
    HlmButton,
    HlmBadge,
    NgIcon,
  ],
  providers: [
    ProductsStore,
    provideIcons({
      lucidePackage,
      lucideFolderTree,
      lucidePlus,
      lucideRefreshCw,
      lucideAlertTriangle,
      lucideCheckCircle2,
      lucideBriefcase,
      lucideLayers,
      lucideX,
    }),
  ],
  template: `
    <div class="space-y-6 min-w-0 max-w-full" data-testid="products-page">

      <!-- Page Header with Action CTAs -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <app-page-header
          title="Produtos & Categorias"
          description="Gestão unificada de catálogo, itens estocáveis, serviços e histórico de preços."
        />

        <div class="flex items-center gap-2.5 shrink-0">
          <button
            hlmBtn
            variant="outline"
            size="sm"
            (click)="openCategoryModal()"
            class="gap-1.5"
            data-testid="btn-open-category-manager"
          >
            <ng-icon name="lucideFolderTree" class="size-4" />
            <span>Categorias</span>
            <span hlmBadge variant="secondary" class="ml-1 px-1.5 py-0 text-[10px]">
              {{ store.activeCategoriesCount() }}
            </span>
          </button>

          <button
            hlmBtn
            size="sm"
            (click)="openCreateProductModal()"
            class="gap-1.5"
            data-testid="btn-open-new-product"
          >
            <ng-icon name="lucidePlus" class="size-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <!-- Total Products -->
        <div hlmCard class="p-3.5 space-y-1">
          <div class="flex items-center justify-between text-muted-foreground">
            <span class="text-xs font-medium">Total de Itens</span>
            <ng-icon name="lucidePackage" class="size-4" />
          </div>
          <div class="text-xl font-bold font-mono text-foreground" data-testid="kpi-total-products">
            {{ store.totalProductsCount() }}
          </div>
        </div>

        <!-- Active Products -->
        <div hlmCard class="p-3.5 space-y-1">
          <div class="flex items-center justify-between text-muted-foreground">
            <span class="text-xs font-medium">Itens Ativos</span>
            <ng-icon name="lucideCheckCircle2" class="size-4 text-emerald-500" />
          </div>
          <div class="text-xl font-bold font-mono text-foreground" data-testid="kpi-active-products">
            {{ store.activeProductsCount() }}
          </div>
        </div>

        <!-- Services -->
        <div hlmCard class="p-3.5 space-y-1">
          <div class="flex items-center justify-between text-muted-foreground">
            <span class="text-xs font-medium">Serviços</span>
            <ng-icon name="lucideBriefcase" class="size-4 text-primary" />
          </div>
          <div class="text-xl font-bold font-mono text-foreground" data-testid="kpi-services-count">
            {{ store.servicesCount() }}
          </div>
        </div>

        <!-- Categories -->
        <div hlmCard class="p-3.5 space-y-1">
          <div class="flex items-center justify-between text-muted-foreground">
            <span class="text-xs font-medium">Categorias Ativas</span>
            <ng-icon name="lucideFolderTree" class="size-4 text-accent" />
          </div>
          <div class="text-xl font-bold font-mono text-foreground" data-testid="kpi-categories-count">
            {{ store.activeCategoriesCount() }}
          </div>
        </div>
      </div>

      <!-- Error State Banner -->
      @if (store.error()) {
        <div
          class="flex items-center justify-between p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs"
          data-testid="products-error-banner"
        >
          <div class="flex items-center gap-2">
            <ng-icon name="lucideAlertTriangle" class="size-4 shrink-0" />
            <span>{{ store.error() }}</span>
          </div>
          <button
            hlmBtn
            variant="ghost"
            size="sm"
            (click)="store.loadAll()"
            class="h-7 text-xs gap-1"
            data-testid="btn-retry-load"
          >
            <ng-icon name="lucideRefreshCw" class="size-3" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      }

      <!-- Main Product Table & Filter Container -->
      <app-product-list
        [products]="store.filteredProducts()"
        [categories]="store.categories()"
        [loading]="store.loading()"
        [filters]="store.filters()"
        (filterChange)="onFilterChange($event)"
        (clearFilters)="store.clearFilters()"
        (createProduct)="openCreateProductModal()"
        (editProduct)="openEditProductModal($event)"
        (changePrice)="openPriceModal($event)"
        (toggleStatus)="onToggleStatus($event)"
      />

      <!-- ================= MODALS & SHEETS ================= -->

      <!-- 1. Product Form Modal (Create or Edit) -->
      @if (showProductModal()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          data-testid="modal-product-form"
        >
          <div
            class="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <button
              type="button"
              (click)="closeProductModal()"
              class="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-md"
              data-testid="btn-close-product-modal"
            >
              <ng-icon name="lucideX" class="size-4" />
            </button>

            <app-product-form
              [product]="selectedProduct()"
              [categories]="store.categories()"
              [saving]="savingProduct()"
              (save)="onSaveProduct($event)"
              (cancel)="closeProductModal()"
              (openCategoryManager)="openCategoryModalFromForm()"
            />
          </div>
        </div>
      }

      <!-- 2. Price Change Dialog Modal -->
      @if (showPriceModal() && selectedProduct()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          data-testid="modal-price-dialog"
        >
          <div
            class="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <button
              type="button"
              (click)="closePriceModal()"
              class="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-md"
              data-testid="btn-close-price-modal"
            >
              <ng-icon name="lucideX" class="size-4" />
            </button>

            <div class="mb-4">
              <h3 class="font-semibold text-foreground text-sm">
                Alteração de Preço de Venda
              </h3>
              <p class="text-xs text-muted-foreground">
                Atualize o preço de tabela do produto. O registro histórico será gerado automaticamente.
              </p>
            </div>

            <app-price-dialog
              [product]="selectedProduct()!"
              [saving]="savingPrice()"
              (savePrice)="onSavePrice($event)"
              (cancel)="closePriceModal()"
            />
          </div>
        </div>
      }

      <!-- 3. Category Manager Modal -->
      @if (showCategoryModal()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          data-testid="modal-category-manager"
        >
          <div
            class="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <button
              type="button"
              (click)="closeCategoryModal()"
              class="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-md"
              data-testid="btn-close-category-modal"
            >
              <ng-icon name="lucideX" class="size-4" />
            </button>

            <app-category-manager
              [categories]="store.categories()"
              [saving]="store.saving()"
              (createCategory)="onCreateCategory($event)"
              (updateCategory)="onUpdateCategory($event)"
              (toggleActive)="onToggleCategoryActive($event)"
              (close)="closeCategoryModal()"
            />

          </div>
        </div>
      }
    </div>
  `,
})
export class ProductsComponent implements OnInit {
  readonly store = inject(ProductsStore);

  readonly showProductModal = signal<boolean>(false);
  readonly showPriceModal = signal<boolean>(false);
  readonly showCategoryModal = signal<boolean>(false);

  readonly selectedProduct = signal<Product | null>(null);
  readonly savingProduct = signal<boolean>(false);
  readonly savingPrice = signal<boolean>(false);

  ngOnInit(): void {
    this.store.loadAll();
  }

  onFilterChange(change: Partial<ProductFilters>): void {
    this.store.updateFilters(change);
  }

  openCreateProductModal(): void {
    this.selectedProduct.set(null);
    this.showProductModal.set(true);
  }

  openEditProductModal(prod: Product): void {
    this.selectedProduct.set(prod);
    this.showProductModal.set(true);
  }

  closeProductModal(): void {
    this.showProductModal.set(false);
    this.selectedProduct.set(null);
  }

  openPriceModal(prod: Product): void {
    this.selectedProduct.set(prod);
    this.showPriceModal.set(true);
    // Load full price history for this product
    this.store.loadProductPriceHistory(prod.id).subscribe((updated: Product) => {
      if (updated && this.selectedProduct()?.id === prod.id) {
        this.selectedProduct.set(updated);
      }
    });
  }

  closePriceModal(): void {
    this.showPriceModal.set(false);
    this.selectedProduct.set(null);
  }

  openCategoryModal(): void {
    this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void {
    this.showCategoryModal.set(false);
  }

  openCategoryModalFromForm(): void {
    this.showCategoryModal.set(true);
  }

  onSaveProduct(payload: CreateProductDto | { id: string; dto: UpdateProductDto }): void {
    this.savingProduct.set(true);

    if ('id' in payload) {
      // Update
      this.store.updateProduct(payload.id, payload.dto).subscribe({
        next: (prod: Product) => {
          this.savingProduct.set(false);
          this.closeProductModal();
          toast.success(`Produto "${prod.name}" atualizado com sucesso!`);
        },
        error: (err: any) => {
          this.savingProduct.set(false);
          toast.error(err.error?.message || 'Erro ao atualizar produto.');
        },
      });
    } else {
      // Create
      this.store.createProduct(payload).subscribe({
        next: (prod: Product) => {
          this.savingProduct.set(false);
          this.closeProductModal();
          toast.success(`Produto "${prod.name}" cadastrado com sucesso!`);
        },
        error: (err: any) => {
          this.savingProduct.set(false);
          toast.error(err.error?.message || 'Erro ao cadastrar produto.');
        },
      });
    }
  }

  onSavePrice(event: { id: string; newPrice: number }): void {
    this.savingPrice.set(true);
    this.store.updateProductPrice(event.id, event.newPrice).subscribe({
      next: (prod: Product) => {
        this.savingPrice.set(false);
        this.closePriceModal();
        toast.success(`Preço do produto "${prod.name}" atualizado com sucesso!`);
      },
      error: (err: any) => {
        this.savingPrice.set(false);
        toast.error(err.error?.message || 'Erro ao alterar preço do produto.');
      },
    });
  }

  onToggleStatus(prod: Product): void {
    this.store.toggleProductStatus(prod.id).subscribe({
      next: (updated: Product) => {
        toast.success(
          `Produto "${updated.name}" ${updated.isActive ? 'ativado' : 'inativado'} com sucesso!`
        );
      },
      error: (err: any) => {
        toast.error(err.error?.message || 'Erro ao alterar status do produto.');
      },
    });
  }

  onCreateCategory(dto: CreateCategoryDto): void {
    this.store.createCategory(dto).subscribe({
      next: (cat: Category) => {
        toast.success(`Categoria "${cat.name}" criada com sucesso!`);
      },
      error: (err: any) => {
        toast.error(err.error?.message || 'Erro ao criar categoria.');
      },
    });
  }

  onUpdateCategory(event: { id: string; dto: UpdateCategoryDto }): void {
    this.store.updateCategory(event.id, event.dto).subscribe({
      next: (cat: Category) => {
        toast.success(`Categoria "${cat.name}" atualizada com sucesso!`);
      },
      error: (err: any) => {
        toast.error(err.error?.message || 'Erro ao atualizar categoria.');
      },
    });
  }


  onToggleCategoryActive(cat: Category): void {
    this.store.toggleCategoryActive(cat).subscribe({
      next: (updated: Category) => {
        toast.success(
          `Categoria "${updated.name}" ${updated.isActive ? 'ativada' : 'inativada'} com sucesso!`
        );
      },
      error: (err: any) => {
        toast.error(err.error?.message || 'Erro ao alterar status da categoria.');
      },
    });
  }
}
