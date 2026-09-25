import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PriceDialogComponent } from './price-dialog.component';
import { createMockProduct } from '../../products.testing';

describe('PriceDialogComponent', () => {
  let component: PriceDialogComponent;
  let fixture: ComponentFixture<PriceDialogComponent>;

  const mockProduct = createMockProduct({
    id: 'prod-100',
    name: 'Teclado Mecânico Pro',
    currentPrice: '250.00',
    averageCost: '150.00',
    priceHistory: [
      {
        id: 'hist-1',
        productId: 'prod-100',
        oldPrice: '200.00',
        newPrice: '250.00',
        averageCost: '150.00',
        changedAt: '2026-03-01T10:00:00Z',
      },
    ],
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', mockProduct);
    fixture.detectChanges();
  });

  it('should create and initialize with current price and margins', () => {
    expect(component).toBeTruthy();
    expect(component.newPriceValue()).toBe(250);
    // currentMargin: (250 - 150) / 250 = 40%
    expect(component.currentMargin()).toBe(40);
    expect(component.newMargin()).toBe(40);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="price-dialog-product-name"]')?.textContent?.trim())
      .toBe('Teclado Mecânico Pro');
    expect(compiled.querySelector('[data-testid="price-dialog-current-price"]')?.textContent?.trim())
      .toContain('250,00');
  });

  it('should update new margin dynamically on input change', () => {
    component.onPriceChange(300);
    fixture.detectChanges();

    // newMargin: (300 - 150) / 300 = 50%
    expect(component.newMargin()).toBe(50);
    expect(component.error()).toBeNull();
  });

  it('should validate empty or invalid price on submit', () => {
    component.onPriceChange('');
    component.onSubmit();
    fixture.detectChanges();

    expect(component.error()).toBe('Informe um preço de venda válido.');
  });

  it('should validate negative price on submit', () => {
    component.onPriceChange(-10);
    component.onSubmit();
    fixture.detectChanges();

    expect(component.error()).toBe('O preço de venda não pode ser negativo.');
  });

  it('should validate identical price on submit', () => {
    component.onPriceChange(250);
    component.onSubmit();
    fixture.detectChanges();

    expect(component.error()).toBe('O novo preço deve ser diferente do preço atual.');
  });

  it('should emit savePrice with id and newPrice when valid', () => {
    const saveSpy = vi.fn();
    component.savePrice.subscribe(saveSpy);

    component.onPriceChange(299.99);
    component.onSubmit();

    expect(saveSpy).toHaveBeenCalledWith({
      id: 'prod-100',
      newPrice: 299.99,
    });
  });

  it('should emit cancel when cancel button is clicked', () => {
    const cancelSpy = vi.fn();
    component.cancel.subscribe(cancelSpy);

    const cancelBtn = fixture.nativeElement.querySelector('[data-testid="btn-cancel-price-change"]');
    cancelBtn?.dispatchEvent(new MouseEvent('click'));

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should render price history rows when present', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const historyRows = compiled.querySelectorAll('tbody tr');
    expect(historyRows.length).toBe(1);
    expect(historyRows[0].textContent).toContain('200,00');
    expect(historyRows[0].textContent).toContain('250,00');
    expect(historyRows[0].textContent).toContain('150,0000');
  });

  it.each([null, NaN, Infinity, -Infinity, 250.001, 1.005, 1e10])('does not submit invalid price %s', (price) => {
    const save = vi.fn();
    component.savePrice.subscribe(save);
    component.onPriceChange(price);
    component.onSubmit();
    expect(save).not.toHaveBeenCalled();
    expect(component.error()).toBeTruthy();
  });

  it('labels both margins as visual estimates and emits no derived financial values', () => {
    const save = vi.fn();
    component.savePrice.subscribe(save);
    component.onPriceChange(300);
    component.onSubmit();
    expect(save).toHaveBeenCalledExactlyOnceWith({ id: mockProduct.id, newPrice: 300 });
    expect(fixture.nativeElement.textContent).toContain('Margem atual estimada');
    expect(fixture.nativeElement.textContent).toContain('base no custo médio atual');
  });
});
