import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createDummyCashFlowSeries } from '../../dashboard.testing';
import { CashFlowChartComponent } from './cash-flow-chart.component';

describe('CashFlowChartComponent', () => {
  let component: CashFlowChartComponent;
  let fixture: ComponentFixture<CashFlowChartComponent>;

  const dummySeries = createDummyCashFlowSeries();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashFlowChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CashFlowChartComponent);
    component = fixture.componentInstance;
  });

  it('should render loading skeleton when loading is true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const skeletonEl = fixture.nativeElement.querySelector('[data-testid="cash-flow-skeleton"]');
    expect(skeletonEl).toBeTruthy();
  });

  it('should render empty state message when series is empty or all zero', () => {
    const emptySeries = [
      { referenceMonth: '2026-04', isClosed: true, inflows: '0.00', outflows: '0.00', netCashFlow: '0.00' },
      { referenceMonth: '2026-05', isClosed: false, inflows: '0.00', outflows: '0.00', netCashFlow: '0.00' },
    ];
    fixture.componentRef.setInput('series', emptySeries);
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('[data-testid="cash-flow-empty"]');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent).toContain('Nenhuma movimentação histórica de caixa registrada');
  });

  it('should render canvas element when data is present and not loading', () => {
    fixture.componentRef.setInput('series', dummySeries);
    fixture.detectChanges();

    const canvasEl = fixture.nativeElement.querySelector('[data-testid="canvas-cash-flow"]');
    expect(canvasEl).toBeTruthy();
    expect(canvasEl.getAttribute('role')).toBe('img');
  });

  it('should toggle accessible table and display formatted currency values', () => {
    fixture.componentRef.setInput('series', dummySeries);
    fixture.detectChanges();

    // Table initially hidden
    expect(fixture.nativeElement.querySelector('[data-testid="cash-flow-data-table"]')).toBeNull();

    // Click toggle button
    const toggleBtn = fixture.nativeElement.querySelector('[data-testid="btn-toggle-cash-flow-table"]');
    expect(toggleBtn).toBeTruthy();
    toggleBtn.click();
    fixture.detectChanges();

    // Table now visible
    const tableEl = fixture.nativeElement.querySelector('[data-testid="cash-flow-data-table"]');
    expect(tableEl).toBeTruthy();

    const textContent = tableEl.textContent.replace(/\u00a0/g, ' ');
    expect(textContent).toContain('Abr/26');
    expect(textContent).toContain('12.000,00');
    expect(textContent).toContain('9.000,00');
    expect(textContent).toContain('3.000,00');
  });

  it('should cleanly destroy chart on component teardown without throwing', () => {
    fixture.componentRef.setInput('series', dummySeries);
    fixture.detectChanges();

    expect(() => fixture.destroy()).not.toThrow();
  });
});
