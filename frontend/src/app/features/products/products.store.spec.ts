import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProductsService } from './products.service';
import { ProductsStore } from './products.store';
import {
  createDummyCategory,
  createDummyProduct,
  createDummyProductList,
} from './products.testing';

describe('ProductsStore', () => {
  let store: ProductsStore;
  let serviceMock: {
    getProducts: ReturnType<typeof vi.fn>;
    getProduct: ReturnType<typeof vi.fn>;
    createProduct: ReturnType<typeof vi.fn>;
    updateProduct: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
    getCategory: ReturnType<typeof vi.fn>;
    createCategory: ReturnType<typeof vi.fn>;
    updateCategory: ReturnType<typeof vi.fn>;
  };

  const dummyProducts = createDummyProductList();
  const dummyCategories = [
    createDummyCategory({ id: 'cat-1', name: 'Bebidas' }),
    createDummyCategory({ id: 'cat-2', name: 'Alimentos', isActive: false }),
  ];

  beforeEach(() => {
    serviceMock = {
      getProducts: vi.fn().mockReturnValue(of(dummyProducts)),
      getProduct: vi.fn().mockReturnValue(of(dummyProducts[0])),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getCategories: vi.fn().mockReturnValue(of(dummyCategories)),
      getCategory: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProductsStore,
        { provide: ProductsService, useValue: serviceMock },
      ],
    });

    store = TestBed.inject(ProductsStore);
  });

  it('should initialize with default signals', () => {
    expect(store.products()).toEqual([]);
    expect(store.categories()).toEqual([]);
    expect(store.selectedProduct()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.saving()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.initialized()).toBe(false);
    expect(store.filterStatus()).toBe('ACTIVE');
  });

  it('should load products and categories on loadAll()', () => {
    store.loadAll();

    expect(serviceMock.getProducts).toHaveBeenCalledTimes(1);
    expect(serviceMock.getCategories).toHaveBeenCalledTimes(1);
    expect(store.products()).toEqual(dummyProducts);
    expect(store.categories()).toEqual(dummyCategories);
    expect(store.initialized()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should handle error on loadAll()', () => {
    serviceMock.getProducts.mockReturnValue(throwError(() => new Error('Server error')));

    store.loadAll();

    expect(store.error()).toBe('Não foi possível carregar os produtos e categorias.');
    expect(store.loading()).toBe(false);
  });

  it('should compute activeCategories correctly', () => {
    store.loadAll();
    expect(store.activeCategories().length).toBe(1);
    expect(store.activeCategories()[0].id).toBe('cat-1');
  });

  it('should filter products by status, category, type and search', () => {
    store.loadAll();

    // Default status: ACTIVE -> returns 2 active products
    expect(store.filteredProducts().length).toBe(2);

    // Filter ALL
    store.setFilterStatus('ALL');
    expect(store.filteredProducts().length).toBe(3);

    // Filter INACTIVE
    store.setFilterStatus('INACTIVE');
    expect(store.filteredProducts().length).toBe(1);
    expect(store.filteredProducts()[0].id).toBe('prod-3');

    // Filter by type
    store.setFilterStatus('ALL');
    store.setFilterType('SERVICE');
    expect(store.filteredProducts().length).toBe(1);
    expect(store.filteredProducts()[0].type).toBe('SERVICE');

    // Search by text
    store.setFilterType('ALL');
    store.setFilterSearch('ipa');
    expect(store.filteredProducts().length).toBe(1);
    expect(store.filteredProducts()[0].name).toContain('IPA');

    // Reset
    store.resetFilters();
    expect(store.filterSearch()).toBe('');
    expect(store.filterStatus()).toBe('ACTIVE');
  });

  it('should add created product and maintain sort order', () => {
    store.loadAll();

    const newProd = createDummyProduct({
      id: 'prod-new',
      name: 'Água Mineral',
    });
    serviceMock.createProduct.mockReturnValue(of(newProd));

    let createdResult: any;
    store
      .createProduct({
        categoryId: 'cat-1',
        name: 'Água Mineral',
        currentPrice: 3.5,
      })
      .subscribe((res) => (createdResult = res));

    expect(createdResult).toEqual(newProd);
    expect(store.products().length).toBe(4);
    // Água Mineral should be first alphabetically
    expect(store.products()[0].name).toBe('Água Mineral');
  });

  it('should update product in list and selectedProduct', () => {
    store.loadAll();

    const updated = { ...dummyProducts[0], name: 'Cerveja IPA Especial' };
    serviceMock.updateProduct.mockReturnValue(of(updated));

    store.updateProduct(dummyProducts[0].id, { name: 'Cerveja IPA Especial' }).subscribe();

    expect(store.products().find((p) => p.id === dummyProducts[0].id)?.name).toBe(
      'Cerveja IPA Especial',
    );
  });

  it('should toggle product active status', () => {
    store.loadAll();

    const target = dummyProducts[0];
    serviceMock.updateProduct.mockReturnValue(of({ ...target, isActive: false }));

    store.toggleProductActive(target).subscribe();

    expect(serviceMock.updateProduct).toHaveBeenCalledWith(target.id, {
      isActive: false,
    });
  });

  it('should change product price', () => {
    store.loadAll();

    const target = dummyProducts[0];
    serviceMock.updateProduct.mockReturnValue(of({ ...target, currentPrice: '21.00' }));

    store.changeProductPrice(target.id, 21.0).subscribe();

    expect(serviceMock.updateProduct).toHaveBeenCalledWith(target.id, {
      currentPrice: 21.0,
    });
  });

  it('should create and update categories', () => {
    store.loadAll();

    const newCat = createDummyCategory({ id: 'cat-new', name: 'Sobremesas' });
    serviceMock.createCategory.mockReturnValue(of(newCat));

    store.createCategory({ name: 'Sobremesas' }).subscribe();
    expect(store.categories().length).toBe(3);

    const updatedCat = { ...newCat, name: 'Doces e Sobremesas' };
    serviceMock.updateCategory.mockReturnValue(of(updatedCat));

    store.updateCategory('cat-new', { name: 'Doces e Sobremesas' }).subscribe();
    expect(store.categories().find((c) => c.id === 'cat-new')?.name).toBe('Doces e Sobremesas');
  });

  it('keeps category status consistent on associated products without deactivating them', () => {
    store.loadAll();
    const category = dummyCategories[0];
    const updated = { ...category, isActive: false };
    serviceMock.updateCategory.mockReturnValue(of(updated));
    store.updateCategory(category.id, { isActive: false }).subscribe();
    const product = store.products().find((p) => p.categoryId === category.id)!;
    expect(product.category?.isActive).toBe(false);
    expect(product.isActive).toBe(true);
  });

  it('stores the price response without manufacturing history or persisting an estimate', () => {
    store.loadAll();
    const target = dummyProducts[0];
    const response = { ...target, currentPrice: '21.00' };
    serviceMock.updateProduct.mockReturnValue(of(response));
    store.changeProductPrice(target.id, 21).subscribe();
    expect(serviceMock.updateProduct).toHaveBeenCalledExactlyOnceWith(target.id, { currentPrice: 21 });
    expect(store.products().find((p) => p.id === target.id)).toEqual(response);
  });
});
