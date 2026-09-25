import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductListComponent } from './product-list.component';
import { createMockCategory, createMockProduct } from '../../products.testing';

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;

  const mockCategories = [
    createMockCategory({ id: 'cat-1', name: 'Eletrônicos' }),
    createMockCategory({ id: 'cat-2', name: 'Serviços' }),
  ];

  const mockProducts = [
    createMockProduct({
      id: 'prod-1',
      name: 'Mouse Óptico',
      categoryId: 'cat-1',
      category: mockCategories[0],
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: '100.00',
      averageCost: '60.00',
      currentStock: '15.000',
      isActive: true,
    }),
    createMockProduct({
      id: 'prod-2',
      name: 'Consultoria TI',
      categoryId: 'cat-2',
      category: mockCategories[1],
      type: 'SERVICE',
      unitOfMeasure: 'UNIT',
      currentPrice: '300.00',
      averageCost: '0.00',
      currentStock: '0.000',
      isActive: false,
    }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categories', mockCategories);
    fixture.componentRef.setInput('products', mockProducts);
    fixture.detectChanges();
  });

  it('should render table rows for each product', () => {
    expect(component).toBeTruthy();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    expect(fixture.nativeElement.textContent).toContain('Mouse Óptico');
    expect(fixture.nativeElement.textContent).toContain('Consultoria TI');
  });

  it('should display N/A for stock when product type is SERVICE', () => {
    const row2 = fixture.nativeElement.querySelector('[data-testid="row-product-prod-2"]');
    expect(row2?.textContent).toContain('N/A');
  });

  it('should calculate gross margin percentage correctly', () => {
    // prod-1: (100 - 60) / 100 = 40%
    const margin = component.getMargin(mockProducts[0]);
    expect(margin).toBe(40);
  });

  it('should emit filterChange on search input', () => {
    const filterSpy = vi.fn();
    component.filterChange.subscribe(filterSpy);

    component.onSearchChange('Mouse');
    expect(filterSpy).toHaveBeenCalledWith({ search: 'Mouse' });
  });

  it('should emit row actions: changePrice, editProduct, toggleStatus', () => {
    const priceSpy = vi.fn();
    const editSpy = vi.fn();
    const toggleSpy = vi.fn();

    component.changePrice.subscribe(priceSpy);
    component.editProduct.subscribe(editSpy);
    component.toggleStatus.subscribe(toggleSpy);

    const priceBtn = fixture.nativeElement.querySelector('[data-testid="btn-price-prod-1"]');
    const editBtn = fixture.nativeElement.querySelector('[data-testid="btn-edit-prod-1"]');
    const toggleBtn = fixture.nativeElement.querySelector('[data-testid="btn-toggle-prod-1"]');

    priceBtn?.dispatchEvent(new MouseEvent('click'));
    expect(priceSpy).toHaveBeenCalledWith(mockProducts[0]);

    editBtn?.dispatchEvent(new MouseEvent('click'));
    expect(editSpy).toHaveBeenCalledWith(mockProducts[0]);

    toggleBtn?.dispatchEvent(new MouseEvent('click'));
    expect(toggleSpy).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('should render skeletons when loading is true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const skeletonContainer = fixture.nativeElement.querySelector('[data-testid="table-loading-skeletons"]');
    expect(skeletonContainer).toBeTruthy();
  });

  it('should render empty state when products list is empty and no filters', () => {
    fixture.componentRef.setInput('products', []);
    fixture.componentRef.setInput('filters', {
      search: '',
      categoryId: 'ALL',
      type: 'ALL',
      status: 'ALL',
    });
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('[data-testid="table-empty-state"]');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('Nenhum produto cadastrado');

    const createSpy = vi.fn();
    component.createProduct.subscribe(createSpy);
    const createBtn = fixture.nativeElement.querySelector('[data-testid="btn-empty-create-product"]');
    createBtn?.dispatchEvent(new MouseEvent('click'));
    expect(createSpy).toHaveBeenCalled();
  });

  it('should render empty filter state when filters are active and no items match', () => {
    fixture.componentRef.setInput('products', []);
    fixture.componentRef.setInput('filters', {
      search: 'Inexistente',
      categoryId: 'ALL',
      type: 'ALL',
      status: 'ALL',
    });
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('[data-testid="table-empty-state"]');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('Nenhum produto encontrado');

    const clearSpy = vi.fn();
    component.clearFilters.subscribe(clearSpy);
    const clearBtn = fixture.nativeElement.querySelector('[data-testid="btn-empty-clear-filters"]');
    clearBtn?.dispatchEvent(new MouseEvent('click'));
    expect(clearSpy).toHaveBeenCalled();
  });
});
