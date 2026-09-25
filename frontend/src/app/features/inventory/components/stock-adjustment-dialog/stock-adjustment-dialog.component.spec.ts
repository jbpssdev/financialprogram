import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InventoryProduct } from '../../inventory.models';
import { StockAdjustmentDialogComponent } from './stock-adjustment-dialog.component';

describe('StockAdjustmentDialogComponent', () => {
  let component: StockAdjustmentDialogComponent;
  let fixture: ComponentFixture<StockAdjustmentDialogComponent>;

  const mockProduct: InventoryProduct = {
    id: 'prod-1',
    name: 'Cerveja Lata',
    description: 'Lata 350ml',
    categoryId: 'cat-1',
    type: 'PRODUCT_STOCK',
    unitOfMeasure: 'UNIT',
    currentPrice: '6.00',
    currentStock: '50.000',
    averageCost: '3.5000',
    stockValue: '175.00',
    potentialRevenue: '300.00',
    potentialGrossProfit: '125.00',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    category: { id: 'cat-1', name: 'Bebidas', description: null, isActive: true },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockAdjustmentDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StockAdjustmentDialogComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('product', mockProduct);
    fixture.componentRef.setInput('saving', false);

    fixture.detectChanges();
  });

  it('should initialize with default positive adjustment and empty fields', () => {
    expect(component.form.controls.type.value).toBe('ADJUSTMENT_POSITIVE');
    expect(component.form.controls.quantity.value).toBeNull();
    expect(component.form.controls.reason.value).toBe('');
    expect(component.form.invalid).toBe(true);
  });

  it('should block submit when quantity exceeds current stock for negative adjustments', () => {
    component.form.patchValue({
      type: 'ADJUSTMENT_NEGATIVE',
      quantity: 60, // currentStock is 50
      reason: 'Falta apurada em contagem',
    });
    fixture.detectChanges();

    expect(component.isQuantityExceedingStock()).toBe(true);
    expect(component.isSubmitDisabled()).toBe(true);

    const errorMsg = fixture.debugElement.query(By.css('[data-testid="insufficient-stock-error"]'));
    expect(errorMsg).toBeTruthy();
  });

  it('should allow submit and emit positive quantity even for negative adjustments', () => {
    vi.spyOn(component.submitAdjustment, 'emit');

    component.form.patchValue({
      type: 'ADJUSTMENT_NEGATIVE',
      quantity: 10,
      reason: 'Falta apurada em contagem semanal',
    });
    fixture.detectChanges();

    expect(component.isQuantityExceedingStock()).toBe(false);
    expect(component.isSubmitDisabled()).toBe(false);

    component.onSubmit();

    expect(component.submitAdjustment.emit).toHaveBeenCalledWith({
      productId: 'prod-1',
      type: 'ADJUSTMENT_NEGATIVE',
      quantity: 10, // positive number strictly expected by backend
      reason: 'Falta apurada em contagem semanal',
      notes: undefined,
    });
  });

  it('should emit cancel event on cancel button click', () => {
    vi.spyOn(component.cancel, 'emit');

    const cancelBtn = fixture.debugElement.query(By.css('[data-testid="btn-cancel-adjustment"]'));
    cancelBtn.nativeElement.click();

    expect(component.cancel.emit).toHaveBeenCalled();
  });
});
