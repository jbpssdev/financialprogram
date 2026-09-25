import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProductsComponent } from './products.component';
import { ProductsService } from './products.service';
import { ProductsStore } from './products.store';
import { createMockCategory, createMockProduct } from './products.testing';

describe('ProductsComponent', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;
  let mockProductsService: {
    getCategories: any;
    getProducts: any;
    getProduct: any;
    createProduct: any;
    updateProduct: any;
    createCategory: any;
    updateCategory: any;

  };

  const sampleCategories = [
    createMockCategory({ id: 'cat-1', name: 'Eletrônicos', isActive: true }),
    createMockCategory({ id: 'cat-2', name: 'Serviços', isActive: true }),
  ];

  const sampleProducts = [
    createMockProduct({
      id: 'prod-1',
      name: 'Notebook Pro 16',
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      currentPrice: '5000.00',
      averageCost: '3500.00',
      currentStock: '10.000',
      isActive: true,
    }),
    createMockProduct({
      id: 'prod-2',
      name: 'Consultoria Cloud',
      categoryId: 'cat-2',
      type: 'SERVICE',
      currentPrice: '250.00',
      averageCost: '0.00',
      currentStock: '0.000',
      isActive: true,
    }),
  ];

  beforeEach(async () => {
    mockProductsService = {
      getCategories: vi.fn().mockReturnValue(of(sampleCategories)),
      getProducts: vi.fn().mockReturnValue(of(sampleProducts)),
      getProduct: vi.fn().mockImplementation((id: string) => {
        const prod = sampleProducts.find((p) => p.id === id) || sampleProducts[0];
        return of({ ...prod, priceHistory: [] });
      }),
      createProduct: vi.fn().mockImplementation((dto) => of({ id: 'prod-new', ...dto })),
      updateProduct: vi.fn().mockImplementation((id, dto) => of({ id, ...dto })),
      createCategory: vi.fn().mockImplementation((dto) => of({ id: 'cat-new', ...dto, isActive: true })),
      updateCategory: vi.fn().mockImplementation((id, dto) => of({ id, ...dto })),

    };

    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load products and categories', () => {
    expect(component).toBeTruthy();
    expect(mockProductsService.getCategories).toHaveBeenCalled();
    expect(mockProductsService.getProducts).toHaveBeenCalled();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="kpi-total-products"]')?.textContent?.trim())
      .toBe('2');
    expect(compiled.querySelector('[data-testid="kpi-active-products"]')?.textContent?.trim())
      .toBe('2');
    expect(compiled.querySelector('[data-testid="kpi-services-count"]')?.textContent?.trim())
      .toBe('1');
    expect(compiled.querySelector('[data-testid="kpi-categories-count"]')?.textContent?.trim())
      .toBe('2');
  });

  it('should open and close Product Form modal in create mode', () => {
    expect(component.showProductModal()).toBe(false);

    const btnNew = fixture.nativeElement.querySelector('[data-testid="btn-open-new-product"]');
    btnNew?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    expect(component.showProductModal()).toBe(true);
    expect(component.selectedProduct()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="modal-product-form"]')).toBeTruthy();

    component.closeProductModal();
    fixture.detectChanges();

    expect(component.showProductModal()).toBe(false);
  });

  it('should open Product Form modal in edit mode with selected product', () => {
    component.openEditProductModal(sampleProducts[0]);
    fixture.detectChanges();

    expect(component.showProductModal()).toBe(true);
    expect(component.selectedProduct()?.id).toBe('prod-1');
  });

  it('should open and close Price Dialog modal', () => {
    expect(component.showPriceModal()).toBe(false);

    component.openPriceModal(sampleProducts[0]);
    fixture.detectChanges();

    expect(component.showPriceModal()).toBe(true);
    expect(component.selectedProduct()?.id).toBe('prod-1');
    expect(mockProductsService.getProduct).toHaveBeenCalledWith('prod-1');

    component.closePriceModal();

    fixture.detectChanges();

    expect(component.showPriceModal()).toBe(false);
  });

  it('should open and close Category Manager modal', () => {
    expect(component.showCategoryModal()).toBe(false);

    const btnCat = fixture.nativeElement.querySelector('[data-testid="btn-open-category-manager"]');
    btnCat?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    expect(component.showCategoryModal()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="modal-category-manager"]')).toBeTruthy();

    component.closeCategoryModal();
    fixture.detectChanges();

    expect(component.showCategoryModal()).toBe(false);
  });

  it('should handle saving new product and close modal', () => {
    component.openCreateProductModal();
    fixture.detectChanges();

    component.onSaveProduct({
      name: 'Tablet 11 Polegadas',
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: 1800,
    });

    expect(mockProductsService.createProduct).toHaveBeenCalled();
    expect(component.showProductModal()).toBe(false);
  });

  it('should handle saving edited product and close modal', () => {
    component.openEditProductModal(sampleProducts[0]);
    fixture.detectChanges();

    component.onSaveProduct({
      id: 'prod-1',
      dto: {
        name: 'Notebook Pro 16 v2',
        currentPrice: 5200,
      },
    });

    expect(mockProductsService.updateProduct).toHaveBeenCalledWith('prod-1', {
      name: 'Notebook Pro 16 v2',
      currentPrice: 5200,
    });
    expect(component.showProductModal()).toBe(false);
  });

  it('should handle updating product price from price dialog', () => {
    component.openPriceModal(sampleProducts[0]);
    fixture.detectChanges();

    component.onSavePrice({
      id: 'prod-1',
      newPrice: 5400,
    });

    expect(mockProductsService.updateProduct).toHaveBeenCalledWith('prod-1', {
      currentPrice: 5400,
    });
    expect(component.showPriceModal()).toBe(false);
  });

  it('should toggle product active status', () => {
    component.onToggleStatus(sampleProducts[0]);

    expect(mockProductsService.updateProduct).toHaveBeenCalledWith('prod-1', {
      isActive: false,
    });
  });
});
