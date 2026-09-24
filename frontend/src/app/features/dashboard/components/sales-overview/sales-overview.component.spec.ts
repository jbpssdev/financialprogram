import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createDummySales } from '../../dashboard.testing';
import { SalesOverviewComponent } from './sales-overview.component';

describe('SalesOverviewComponent', () => {
  let fixture: ComponentFixture<SalesOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesOverviewComponent);
  });

  it('should render sales summary and top products table when sales exist', () => {
    fixture.componentRef.setInput('sales', createDummySales());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Desempenho Comercial de Vendas');
    expect(text).toContain('42'); // completed count
    expect(text).toContain('1'); // canceled count
    expect(text).toContain('R$ 357,14'); // ticket médio
    expect(text).toContain('Produto Alpha');
    expect(text).toContain('50 UN');
    expect(text).toContain('R$ 7.500,00');
  });

  it('should render empty sales state message when top products is empty', () => {
    const emptySales = createDummySales({
      salesSummary: {
        completedSalesCount: 0,
        canceledSalesCount: 0,
        grossRevenue: '0.00',
        cogs: '0.00',
        grossProfit: '0.00',
        averageTicket: '0.00',
      },
      topProducts: { byRevenue: [], byQuantity: [], byGrossProfit: [] },
    });
    fixture.componentRef.setInput('sales', emptySales);
    fixture.detectChanges();

    const emptyCard = fixture.nativeElement.querySelector('[data-testid="empty-sales"]');
    expect(emptyCard).toBeTruthy();
    expect(emptyCard.textContent).toContain('Nenhuma venda registrada neste período.');
  });
});
