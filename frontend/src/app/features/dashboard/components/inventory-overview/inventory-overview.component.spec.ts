import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createDummyInventory } from '../../dashboard.testing';
import { InventoryOverviewComponent } from './inventory-overview.component';

describe('InventoryOverviewComponent', () => {
  let fixture: ComponentFixture<InventoryOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryOverviewComponent);
  });

  it('should render inventory stats and critical items list', () => {
    fixture.componentRef.setInput('inventory', createDummyInventory());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Posição Atual de Estoque');
    expect(text).toContain('12'); // active count
    expect(text).toContain('1'); // zero stock count
    expect(text).toContain('R$ 25.000,00'); // total value
    expect(text).toContain('Item Zerado');
    expect(text).toContain('Item Crítico');
    expect(text).toContain('2,5 KG');
  });

  it('should render regular stock message when no items are zero or low stock', () => {
    const regularInventory = createDummyInventory({
      zeroStockCount: 0,
      lowStockCount: 0,
      zeroStockItems: [],
      lowStockItems: [],
    });
    fixture.componentRef.setInput('inventory', regularInventory);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todos os produtos estão com níveis regulares de estoque.');
  });
});
