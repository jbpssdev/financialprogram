import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, Observable, tap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  Category,
  CreateCategoryDto,
  CreateProductDto,
  Product,
  ProductFilters,
  UpdateCategoryDto,
  UpdateProductDto,
} from './products.models';
import { ProductsService } from './products.service';

@Injectable()
export class ProductsStore {
  private readonly productsService = inject(ProductsService);

  // Core data signals
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly selectedProduct = signal<Product | null>(null);

  // Status signals
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly initialized = signal<boolean>(false);

  // Filter signals
  readonly filterSearch = signal<string>('');
  readonly filterCategoryId = signal<string>('ALL');
  readonly filterType = signal<string>('ALL');
  readonly filterStatus = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Computed signals
  readonly activeCategories = computed(() =>
    this.categories().filter((c) => c.isActive),
  );

  readonly totalProductsCount = computed(() => this.products().length);
  readonly activeProductsCount = computed(() => this.products().filter((p) => p.isActive).length);
  readonly servicesCount = computed(() => this.products().filter((p) => p.type === 'SERVICE').length);
  readonly activeCategoriesCount = computed(() => this.activeCategories().length);

  readonly filters = computed<ProductFilters>(() => ({
    search: this.filterSearch(),
    categoryId: this.filterCategoryId(),
    type: this.filterType(),
    status: this.filterStatus(),
  }));

  readonly filteredProducts = computed(() => {
    const list = this.products();
    const search = this.filterSearch().trim().toLowerCase();
    const catId = this.filterCategoryId();
    const type = this.filterType();
    const status = this.filterStatus();

    return list.filter((p) => {
      // 1. Text Search (name or description)
      if (search) {
        const nameMatch = p.name.toLowerCase().includes(search);
        const descMatch = p.description ? p.description.toLowerCase().includes(search) : false;
        if (!nameMatch && !descMatch) return false;
      }

      // 2. Category Filter
      if (catId !== 'ALL' && p.categoryId !== catId) {
        return false;
      }

      // 3. Item Type Filter
      if (type !== 'ALL' && p.type !== type) {
        return false;
      }

      // 4. Status Filter
      if (status === 'ACTIVE' && !p.isActive) {
        return false;
      }
      if (status === 'INACTIVE' && p.isActive) {
        return false;
      }

      return true;
    });
  });

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      products: this.productsService.getProducts(),
      categories: this.productsService.getCategories(),
    }).subscribe({
      next: ({ products, categories }) => {
        this.products.set(products);
        this.categories.set(categories);
        this.initialized.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os produtos e categorias.');
        this.loading.set(false);
      },
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productsService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível atualizar a lista de produtos.');
        this.loading.set(false);
      },
    });
  }

  loadCategories(): void {
    this.productsService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
      },
      error: () => {
        this.error.set('Não foi possível atualizar a lista de categorias.');
      },
    });
  }

  loadProductDetails(id: string): Observable<Product> {
    return this.productsService.getProduct(id).pipe(
      tap((product) => {
        this.selectedProduct.set(product);
      }),
    );
  }

  createProduct(dto: CreateProductDto): Observable<Product> {
    this.saving.set(true);
    return this.productsService.createProduct(dto).pipe(
      tap((created) => {
        this.products.update((list) => {
          const updated = [...list, created];
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        });
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  updateProduct(id: string, dto: UpdateProductDto): Observable<Product> {
    this.saving.set(true);
    return this.productsService.updateProduct(id, dto).pipe(
      tap((updated) => {
        this.products.update((list) =>
          list
            .map((p) => (p.id === id ? { ...p, ...updated } : p))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        if (this.selectedProduct()?.id === id) {
          this.selectedProduct.set({ ...this.selectedProduct()!, ...updated });
        }
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  toggleProductActive(product: Product): Observable<Product> {
    return this.updateProduct(product.id, { isActive: !product.isActive });
  }

  changeProductPrice(id: string, newPrice: number): Observable<Product> {
    return this.updateProduct(id, { currentPrice: newPrice });
  }

  createCategory(dto: CreateCategoryDto): Observable<Category> {
    this.saving.set(true);
    return this.productsService.createCategory(dto).pipe(
      tap((created) => {
        this.categories.update((list) => {
          const updated = [...list, created];
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        });
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  updateCategory(id: string, dto: UpdateCategoryDto): Observable<Category> {
    this.saving.set(true);
    return this.productsService.updateCategory(id, dto).pipe(
      tap((updated) => {
        this.categories.update((list) =>
          list
            .map((c) => (c.id === id ? { ...c, ...updated } : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        // Keep the embedded category consistent with the API response, including status.
        this.products.update((list) =>
          list.map((p) =>
            p.categoryId === id
              ? { ...p, category: updated }
              : p,
          ),
        );
        const selected = this.selectedProduct();
        if (selected?.categoryId === id) {
          this.selectedProduct.set({ ...selected, category: updated });
        }
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  toggleCategoryActive(category: Category): Observable<Category> {
    return this.updateCategory(category.id, { isActive: !category.isActive });
  }

  loadProductPriceHistory(id: string): Observable<Product> {
    return this.loadProductDetails(id);
  }

  updateProductPrice(id: string, newPrice: number): Observable<Product> {
    return this.changeProductPrice(id, newPrice);
  }

  toggleProductStatus(id: string): Observable<Product> {
    const prod = this.products().find((p) => p.id === id);
    if (!prod) {
      throw new Error(`Produto não encontrado: ${id}`);
    }
    return this.toggleProductActive(prod);
  }

  toggleCategoryStatus(id: string): Observable<Category> {
    const cat = this.categories().find((c) => c.id === id);
    if (!cat) {
      throw new Error(`Categoria não encontrada: ${id}`);
    }
    return this.toggleCategoryActive(cat);
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

  setFilterStatus(status: 'ALL' | 'ACTIVE' | 'INACTIVE'): void {
    this.filterStatus.set(status);
  }

  updateFilters(partial: Partial<ProductFilters>): void {
    if (partial.search !== undefined) this.filterSearch.set(partial.search);
    if (partial.categoryId !== undefined) this.filterCategoryId.set(partial.categoryId);
    if (partial.type !== undefined) this.filterType.set(partial.type);
    if (partial.status !== undefined) this.filterStatus.set(partial.status);
  }

  clearFilters(): void {
    this.resetFilters();
  }

  resetFilters(): void {
    this.filterSearch.set('');
    this.filterCategoryId.set('ALL');
    this.filterType.set('ALL');
    this.filterStatus.set('ACTIVE');
  }
}
