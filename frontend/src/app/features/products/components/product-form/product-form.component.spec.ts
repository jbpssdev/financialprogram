import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductFormComponent } from './product-form.component';
import { createMockCategory, createMockProduct } from '../../products.testing';

describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;

  const mockCategories = [
    createMockCategory({ id: 'cat-1', name: 'Eletrônicos', isActive: true }),
    createMockCategory({ id: 'cat-2', name: 'Serviços de TI', isActive: true }),
    createMockCategory({ id: 'cat-3', name: 'Antiga Inativa', isActive: false }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categories', mockCategories);
    fixture.detectChanges();
  });

  it('should create in create mode with default values', () => {
    expect(component).toBeTruthy();
    expect(component.isEditing()).toBe(false);
    expect(component.form.get('type')?.value).toBe('PRODUCT_STOCK');
    expect(component.form.get('unitOfMeasure')?.value).toBe('UNIT');
  });

  it('should switch to edit mode when product input is provided', () => {
    const existing = createMockProduct({
      id: 'prod-42',
      name: 'Monitor Ultrawide 34',
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: '2800.00',
      averageCost: '2100.00',
      currentStock: '12.000',
    });

    fixture.componentRef.setInput('product', existing);
    fixture.detectChanges();

    expect(component.isEditing()).toBe(true);
    expect(component.form.get('name')?.value).toBe('Monitor Ultrawide 34');
    expect(component.form.get('currentPrice')?.value).toBe(2800);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="form-title"]')?.textContent?.trim())
      .toBe('Editar Produto');
    expect(compiled.querySelector('[data-testid="form-stock-info"]')?.textContent?.trim())
      .toContain('12');
  });

  it('should show service callout when SERVICE type is selected', () => {
    component.form.patchValue({ type: 'SERVICE' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const callout = compiled.querySelector('[data-testid="service-callout"]');
    expect(callout).toBeTruthy();
    expect(callout?.textContent).toContain('Serviços não possuem controle de estoque físico');
  });

  it('should validate required fields', () => {
    component.form.patchValue({
      name: '',
      categoryId: '',
      currentPrice: null,
    });
    component.onSubmit();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(component.form.get('name')?.hasError('required')).toBe(true);
    expect(component.form.get('categoryId')?.hasError('required')).toBe(true);
    expect(component.form.get('currentPrice')?.hasError('required')).toBe(true);
  });

  it('should emit save with CreateProductDto in create mode', () => {
    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    component.form.patchValue({
      name: 'Notebook Dell XPS',
      description: 'i7 32GB RAM',
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: 8500,
    });

    component.onSubmit();

    expect(saveSpy).toHaveBeenCalledWith({
      name: 'Notebook Dell XPS',
      description: 'i7 32GB RAM',
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: 8500,
    });
  });

  it('should emit save with { id, dto } in edit mode', () => {
    const existing = createMockProduct({
      id: 'prod-42',
      name: 'Monitor Ultrawide 34',
      description: null,
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: '2800.00',
    });


    fixture.componentRef.setInput('product', existing);
    fixture.detectChanges();

    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    component.form.patchValue({
      name: 'Monitor Ultrawide 34 Pro',
      currentPrice: 2950,
    });

    component.onSubmit();

    expect(saveSpy).toHaveBeenCalledWith({
      id: 'prod-42',
      dto: {
        name: 'Monitor Ultrawide 34 Pro',
        description: '',
        categoryId: 'cat-1',
        type: 'PRODUCT_STOCK',
        unitOfMeasure: 'UNIT',
        currentPrice: 2950,
      },
    });
  });

  it('should emit cancel when cancel button is clicked', () => {
    const cancelSpy = vi.fn();
    component.cancel.subscribe(cancelSpy);

    const cancelBtn = fixture.nativeElement.querySelector('[data-testid="btn-cancel-product-form"]');
    cancelBtn?.dispatchEvent(new MouseEvent('click'));

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('omits unchanged price, stock, cost and estimated margin from a cadastral update', () => {
    fixture.componentRef.setInput('product', createMockProduct({
      categoryId: 'cat-1', currentPrice: '19.90', currentStock: '1.125', averageCost: '3.1234',
    }));
    fixture.detectChanges();
    const save = vi.fn();
    component.save.subscribe(save);
    component.form.patchValue({ name: 'Nome atualizado' });
    component.onSubmit();
    expect(save).toHaveBeenCalledOnce();
    expect(Object.keys(save.mock.calls[0][0].dto).sort()).toEqual(
      ['name', 'description', 'categoryId', 'type', 'unitOfMeasure'].sort(),
    );
    expect(fixture.nativeElement.querySelector('[data-testid="form-stock-info"]').textContent).toContain('1,125');
    expect(fixture.nativeElement.querySelector('[data-testid="form-cost-info"]').textContent).toContain('3,1234');
  });

  it.each([NaN, Infinity, -1, 1.005, 1e10])('rejects invalid price %s without emitting', (price) => {
    component.form.patchValue({ name: 'Produto', categoryId: 'cat-1', currentPrice: price });
    const save = vi.fn();
    component.save.subscribe(save);
    component.onSubmit();
    expect(save).not.toHaveBeenCalled();
    expect(component.priceControl?.invalid).toBe(true);
  });

  it('allows all contract units for SERVICE and sends only cadastral fields and price', () => {
    const save = vi.fn();
    component.save.subscribe(save);
    for (const unit of ['UNIT', 'KG', 'LITER', 'PACK', 'BOX', 'TOKEN']) {
      component.form.patchValue({ name: 'Serviço', categoryId: 'cat-1', type: 'SERVICE', unitOfMeasure: unit, currentPrice: 10 });
      component.onSubmit();
      const dto = save.mock.lastCall![0];
      expect(dto.unitOfMeasure).toBe(unit);
      expect(dto.currentPrice).toBe(10);
      expect(Object.keys(dto).sort()).toEqual(['name', 'description', 'categoryId', 'type', 'unitOfMeasure', 'currentPrice'].sort());
    }
    expect(component.form.contains('averageCost')).toBe(false);
    expect(component.form.contains('currentStock')).toBe(false);
  });

  it('should emit openCategoryManager when button is clicked', () => {
    const openSpy = vi.fn();
    component.openCategoryManager.subscribe(openSpy);

    const btn = fixture.nativeElement.querySelector('[data-testid="btn-manage-categories-from-form"]');
    btn?.dispatchEvent(new MouseEvent('click'));

    expect(openSpy).toHaveBeenCalled();
  });
});
