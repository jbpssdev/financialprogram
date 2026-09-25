import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { InventoryProduct } from './inventory.models';
import { InventoryService } from './inventory.service';
import { InventoryComponent } from './inventory.component';

describe('InventoryComponent', () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  let mockInventoryService: {
    getInventoryOverview: ReturnType<typeof vi.fn>;
    getProductInventory: ReturnType<typeof vi.fn>;
    getProductMovements: ReturnType<typeof vi.fn>;
    setOpeningBalance: ReturnType<typeof vi.fn>;
    createAdjustment: ReturnType<typeof vi.fn>;
  };

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
      name: 'Couvert Artístico',
      description: 'Música ao vivo',
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
    mockInventoryService = {
      getInventoryOverview: vi.fn().mockReturnValue(of(mockItems)),
      getProductInventory: vi.fn(),
      getProductMovements: vi.fn().mockReturnValue(of([])),
      setOpeningBalance: vi.fn(),
      createAdjustment: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [InventoryComponent],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render PageHeaderComponent with title Estoque', () => {
    const pageHeader = fixture.debugElement.query(By.directive(PageHeaderComponent));
    expect(pageHeader).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Estoque');
  });

  it('should render KPI metrics properly', () => {
    const totalEl = fixture.debugElement.query(By.css('[data-testid="kpi-total-items"]'));
    const inStockEl = fixture.debugElement.query(By.css('[data-testid="kpi-in-stock"]'));
    const outOfStockEl = fixture.debugElement.query(By.css('[data-testid="kpi-out-of-stock"]'));
    const servicesEl = fixture.debugElement.query(By.css('[data-testid="kpi-services"]'));

    expect(totalEl.nativeElement.textContent.trim()).toBe('3');
    expect(inStockEl.nativeElement.textContent.trim()).toBe('1');
    expect(outOfStockEl.nativeElement.textContent.trim()).toBe('1');
    expect(servicesEl.nativeElement.textContent.trim()).toBe('1');
  });

  it('should open and close movements history modal', () => {
    component.onViewMovements(mockItems[0]);
    fixture.detectChanges();

    const modal = fixture.debugElement.query(By.css('[data-testid="modal-movements"]'));
    expect(modal).toBeTruthy();
    expect(component.showMovementsModal()).toBe(true);

    component.closeMovementsModal();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="modal-movements"]'))).toBeNull();
    expect(component.showMovementsModal()).toBe(false);
  });

  it('should open and close adjustment modal', () => {
    component.onOpenAdjustment(mockItems[0]);
    fixture.detectChanges();

    const modal = fixture.debugElement.query(By.css('[data-testid="modal-adjustment"]'));
    expect(modal).toBeTruthy();
    expect(component.showAdjustmentModal()).toBe(true);

    component.closeAdjustmentModal();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="modal-adjustment"]'))).toBeNull();
  });

  it('should open and close opening balance modal', () => {
    component.onOpenOpeningBalance(mockItems[1]);
    fixture.detectChanges();

    const modal = fixture.debugElement.query(By.css('[data-testid="modal-opening-balance"]'));
    expect(modal).toBeTruthy();
    expect(component.showOpeningModal()).toBe(true);

    component.closeOpeningModal();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="modal-opening-balance"]'))).toBeNull();
  });

  it('should display global error when store.error has value', () => {
    component.store.error.set('Erro de servidor');
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('[data-testid="inventory-global-error"]'));
    expect(errorEl).toBeTruthy();
    expect(errorEl.nativeElement.textContent).toContain('Erro de servidor');
  });
});
