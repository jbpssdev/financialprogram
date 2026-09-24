import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createDummySummary } from '../../dashboard.testing';
import { CashSummaryComponent } from './cash-summary.component';

describe('CashSummaryComponent', () => {
  let fixture: ComponentFixture<CashSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CashSummaryComponent);
  });

  it('should render the full cash flow statement with inflows, outflows and net cash', () => {
    const summary = createDummySummary();
    fixture.componentRef.setInput('cashFlow', summary.cashFlow);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fluxo de Caixa Realizado');
    expect(text).toContain('R$ 14.500,00'); // Total Inflows
    expect(text).toContain('R$ 14.000,00'); // Vendas Recebidas
    expect(text).toContain('-R$ 10.800,00'); // Total Outflows
    expect(text).toContain('R$ 5.000,00'); // Compras
    expect(text).toContain('R$ 3.700,00'); // Saldo Líquido
  });
});
