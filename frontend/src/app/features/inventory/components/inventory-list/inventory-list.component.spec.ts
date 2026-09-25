import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InventoryProduct } from '../../inventory.models';
import { InventoryListComponent } from './inventory-list.component';

describe('InventoryListComponent', () => {
  let component: InventoryListComponent;
  let fixture: ComponentFixture<InventoryListComponent>;

  const mockItems: InventoryProduct[] = [
    {
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
    },
    {
      id: 'prod-2',
      name: 'Refrigerante 2L',
      description: null,
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: '10.00',
      currentStock: '0.000',
      averageCost: '5.0000',
      stockValue: '0.00',
      potentialRevenue: '0.00',
      potentialGrossProfit: '0.00',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      category: { id: 'cat-1', name: 'Bebidas', description: null, isActive: true },
    },
    {
      id: 'prod-3',
      name: 'Música ao Vivo',
      description: 'Couvert artístico',
      categoryId: 'cat-2',
      type: 'SERVICE',
      unitOfMeasure: 'UNIT',
      currentPrice: '15.00',
      currentStock: '0.000',
      averageCost: '0.0000',
      stockValue: '0.00',
      potentialRevenue: '0.00',
      potentialGrossProfit: '0.00',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      category: { id: 'cat-2', name: 'Serviços', description: null, isActive: true },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryListComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('categories', [{ id: 'cat-1', name: 'Bebidas' }, { id: 'cat-2', name: 'Serviços' }]);
    fixture.componentRef.setInput('filters', {
      search: '',
      categoryId: 'ALL',
      type: 'ALL',
      stockStatus: 'ALL',
    });
    fixture.componentRef.setInput('loading', false);

    fixture.detectChanges();
  });

  it('should render table rows for each item', () => {
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(3);

    expect(fixture.nativeElement.textContent).toContain('Cerveja Lata');
    expect(fixture.nativeElement.textContent).toContain('Refrigerante 2L');
    expect(fixture.nativeElement.textContent).toContain('Música ao Vivo');
  });

  it('should format stock, cost and value using decimal preservation rules', () => {
    const row1 = fixture.debugElement.query(By.css('[data-testid="inventory-row-prod-1"]'));
    expect(row1.nativeElement.textContent).toContain('150');
    expect(row1.nativeElement.textContent).toContain('R$ 3,5000');
    expect(row1.nativeElement.textContent).toContain('R$ 525,00');
  });

  it('should show "Não se aplica" for SERVICE items in stock column', () => {
    const serviceRow = fixture.debugElement.query(By.css('[data-testid="inventory-row-prod-3"]'));
    expect(serviceRow.nativeElement.textContent).toContain('Não se aplica');
    expect(serviceRow.nativeElement.textContent).toContain('Serviço');
  });

  it('should not show adjustment or opening buttons for SERVICE items', () => {
    const adjustBtn = fixture.debugElement.query(By.css('[data-testid="btn-adjust-prod-3"]'));
    const openingBtn = fixture.debugElement.query(By.css('[data-testid="btn-opening-prod-3"]'));
    expect(adjustBtn).toBeNull();
    expect(openingBtn).toBeNull();
  });

  it('should emit viewMovements when clicking history button', () => {
    vi.spyOn(component.viewMovements, 'emit');
    const historyBtn = fixture.debugElement.query(By.css('[data-testid="btn-movements-prod-1"]'));
    historyBtn.nativeElement.click();

    expect(component.viewMovements.emit).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should emit openAdjustment when clicking adjust button', () => {
    vi.spyOn(component.openAdjustment, 'emit');
    const adjustBtn = fixture.debugElement.query(By.css('[data-testid="btn-adjust-prod-1"]'));
    adjustBtn.nativeElement.click();

    expect(component.openAdjustment.emit).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should emit openOpeningBalance when clicking opening balance button', () => {
    vi.spyOn(component.openOpeningBalance, 'emit');
    const openingBtn = fixture.debugElement.query(By.css('[data-testid="btn-opening-prod-1"]'));
    openingBtn.nativeElement.click();

    expect(component.openOpeningBalance.emit).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should render empty state when items list is empty and not loading', () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('[data-testid="inventory-empty-state"]'));
    expect(empty).toBeTruthy();
    expect(empty.nativeElement.textContent).toContain('Nenhum item com controle de estoque encontrado.');
  });
});
