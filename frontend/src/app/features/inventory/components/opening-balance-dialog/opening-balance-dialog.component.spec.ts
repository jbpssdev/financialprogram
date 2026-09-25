import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InventoryProduct } from '../../inventory.models';
import { OpeningBalanceDialogComponent } from './opening-balance-dialog.component';

describe('OpeningBalanceDialogComponent', () => {
  let component: OpeningBalanceDialogComponent;
  let fixture: ComponentFixture<OpeningBalanceDialogComponent>;

  const mockProduct: InventoryProduct = {
    id: 'prod-1',
    name: 'Cerveja Lata',
    description: 'Lata 350ml',
    categoryId: 'cat-1',
    type: 'PRODUCT_STOCK',
    unitOfMeasure: 'UNIT',
    currentPrice: '6.00',
    currentStock: '0.000',
    averageCost: '0.0000',
    stockValue: '0.00',
    potentialRevenue: '0.00',
    potentialGrossProfit: '0.00',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    category: { id: 'cat-1', name: 'Bebidas', description: null, isActive: true },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpeningBalanceDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OpeningBalanceDialogComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('product', mockProduct);
    fixture.componentRef.setInput('saving', false);

    fixture.detectChanges();
  });

  it('should initialize with invalid empty form', () => {
    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.quantity.value).toBeNull();
    expect(component.form.controls.unitCost.value).toBeNull();
  });

  it('should validate quantity > 0 and unitCost >= 0', () => {
    component.form.patchValue({ quantity: -5, unitCost: -1 });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ quantity: 100, unitCost: 4.5 });
    expect(component.form.valid).toBe(true);
  });

  it('should emit submitOpeningBalance with valid values', () => {
    vi.spyOn(component.submitOpeningBalance, 'emit');

    component.form.patchValue({ quantity: 200, unitCost: 3.5 });
    fixture.detectChanges();

    component.onSubmit();

    expect(component.submitOpeningBalance.emit).toHaveBeenCalledWith({
      productId: 'prod-1',
      quantity: 200,
      unitCost: 3.5,
    });
  });

  it('should emit cancel event on cancel button click', () => {
    vi.spyOn(component.cancel, 'emit');

    const cancelBtn = fixture.debugElement.query(By.css('[data-testid="btn-cancel-opening"]'));
    cancelBtn.nativeElement.click();

    expect(component.cancel.emit).toHaveBeenCalled();
  });
});
