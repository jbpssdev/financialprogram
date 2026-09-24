import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createDummyDebt } from '../../dashboard.testing';
import { DebtOverviewComponent } from './debt-overview.component';

describe('DebtOverviewComponent', () => {
  let fixture: ComponentFixture<DebtOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebtOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DebtOverviewComponent);
  });

  it('should render active loans count, remaining balance, overdue alert and upcoming installments', () => {
    fixture.componentRef.setInput('debt', createDummyDebt());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Passivo Financeiro (Empréstimos)');
    expect(text).toContain('2'); // active loans
    expect(text).toContain('R$ 18.000,00'); // remaining
    expect(text).toContain('1'); // overdue count

    const overdueAlert = fixture.nativeElement.querySelector('[data-testid="overdue-alert"]');
    expect(overdueAlert).toBeTruthy();
    expect(overdueAlert.textContent).toContain('R$ 1.200,00');

    expect(text).toContain('Próximos Vencimentos');
    expect(text).toContain('01/10/2026'); // formatted date
  });

  it('should render empty debt message when there are no active loans', () => {
    const emptyDebt = createDummyDebt({
      activeLoansCount: 0,
      totalRemainingPrincipal: '0.00',
      overdueInstallmentsCount: 0,
      totalOverdueAmount: '0.00',
      overdueInstallments: [],
      upcomingInstallments: [],
      activeLoans: [],
    });
    fixture.componentRef.setInput('debt', emptyDebt);
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-loans"]');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent).toContain('Não há empréstimos em aberto no momento.');
  });
});
