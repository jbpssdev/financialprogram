import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createDummySummary } from '../../dashboard.testing';
import { EconomicSummaryComponent } from './economic-summary.component';

describe('EconomicSummaryComponent', () => {
  let fixture: ComponentFixture<EconomicSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EconomicSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EconomicSummaryComponent);
  });

  it('should render the full economic breakdown with correct signs and values', () => {
    const summary = createDummySummary();
    fixture.componentRef.setInput('economic', summary.economic);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Resultado Econômico (Competência)');
    expect(text).toContain('R$ 15.000,00'); // Receita Bruta
    expect(text).toContain('-R$ 6.000,00'); // CMV
    expect(text).toContain('R$ 9.000,00'); // Lucro Bruto
    expect(text).toContain('+R$ 500,00'); // Outras Receitas
    expect(text).toContain('-R$ 3.000,00'); // Despesas PJ
    expect(text).toContain('-R$ 200,00'); // Juros
    expect(text).toContain('R$ 6.300,00'); // Resultado Operacional
    expect(text).toContain('-R$ 2.000,00'); // Despesas PF
    expect(text).toContain('R$ 4.300,00'); // Resultado Final
  });
});
