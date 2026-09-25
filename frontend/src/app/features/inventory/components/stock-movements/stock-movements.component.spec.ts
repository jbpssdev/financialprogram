import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InventoryProduct, StockMovement } from '../../inventory.models';
import { StockMovementsComponent } from './stock-movements.component';

describe('StockMovementsComponent', () => {
  let component: StockMovementsComponent;
  let fixture: ComponentFixture<StockMovementsComponent>;

  const mockProduct: InventoryProduct = {
    id: 'prod-1',
    name: 'Cerveja Lata',
    description: 'Lata 350ml',
    categoryId: 'cat-1',
    type: 'PRODUCT_STOCK',
    unitOfMeasure: 'UNIT',
    currentPrice: '6.00',
    currentStock: '150.000',
    averageCost: '3.5000',
    stockValue: '525.00',
    potentialRevenue: '900.00',
    potentialGrossProfit: '375.00',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    category: { id: 'cat-1', name: 'Bebidas', description: null, isActive: true },
  };

  const mockMovements: StockMovement[] = [
    {
      id: 'mov-1',
      productId: 'prod-1',
      purchaseItemId: null,
      saleItemId: null,
      type: 'INITIAL_BALANCE',
      quantity: '100.000',
      unitCost: '3.5000',
      totalCost: '350.00',
      averageCostAfter: '3.5000',
      balanceAfter: '100.000',
      stockValueAfter: '350.00',
      reason: 'Saldo inicial de implantação',
      movementDate: '2026-09-01T10:00:00Z',
      createdAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'mov-2',
      productId: 'prod-1',
      purchaseItemId: null,
      saleItemId: null,
      type: 'ADJUSTMENT_POSITIVE',
      quantity: '50.000',
      unitCost: '3.5000',
      totalCost: '175.00',
      averageCostAfter: '3.5000',
      balanceAfter: '150.000',
      stockValueAfter: '525.00',
      reason: 'Sobra em contagem',
      movementDate: '2026-09-05T14:30:00Z',
      createdAt: '2026-09-05T14:30:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockMovementsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StockMovementsComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('product', mockProduct);
    fixture.componentRef.setInput('movements', mockMovements);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);

    fixture.detectChanges();
  });

  it('should render product summary and movements table', () => {
    expect(fixture.nativeElement.textContent).toContain('Cerveja Lata');
    expect(fixture.nativeElement.textContent).toContain('150');
    expect(fixture.nativeElement.textContent).toContain('R$ 3,5000');
    expect(fixture.nativeElement.textContent).toContain('R$ 525,00');

    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Saldo Inicial');
    expect(fixture.nativeElement.textContent).toContain('Ajuste Positivo');
  });

  it('should display empty message when movements array is empty', () => {
    fixture.componentRef.setInput('movements', []);
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('[data-testid="movements-empty"]'));
    expect(empty).toBeTruthy();
    expect(empty.nativeElement.textContent).toContain('Nenhuma movimentação registrada.');
  });

  it('should display error banner and emit retry on click', () => {
    fixture.componentRef.setInput('error', 'Falha ao buscar movimentações');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Falha ao buscar movimentações');

    vi.spyOn(component.retry, 'emit');
    const retryBtn = fixture.debugElement.query(By.css('button[variant="outline"]'));
    retryBtn.nativeElement.click();

    expect(component.retry.emit).toHaveBeenCalled();
  });

  it('should emit close when close button is clicked', () => {
    vi.spyOn(component.close, 'emit');
    const closeBtn = fixture.debugElement.query(By.css('[data-testid="btn-close-movements"]'));
    closeBtn.nativeElement.click();

    expect(component.close.emit).toHaveBeenCalled();
  });
});
