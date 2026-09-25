import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createDummyTrendsSeries } from '../../dashboard.testing';
import { TrendsChartComponent } from './trends-chart.component';

describe('TrendsChartComponent', () => {
  let component: TrendsChartComponent;
  let fixture: ComponentFixture<TrendsChartComponent>;

  const dummySeries = createDummyTrendsSeries();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendsChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TrendsChartComponent);
    component = fixture.componentInstance;
  });

  it('should render loading skeleton when loading is true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const skeletonEl = fixture.nativeElement.querySelector('[data-testid="trends-skeleton"]');
    expect(skeletonEl).toBeTruthy();
  });

  it('should render empty state message when series is empty or all zero', () => {
    const emptySeries = [
      {
        referenceMonth: '2026-04',
        isClosed: true,
        grossRevenue: '0.00',
        grossProfit: '0.00',
        operatingResult: '0.00',
        netCashFlow: '0.00',
      },
    ];
    fixture.componentRef.setInput('series', emptySeries);
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('[data-testid="trends-empty"]');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent).toContain('Nenhuma movimentação histórica de resultado registrada');
  });

  it('should render canvas element when data is present and not loading', () => {
    fixture.componentRef.setInput('series', dummySeries);
    fixture.detectChanges();

    const canvasEl = fixture.nativeElement.querySelector('[data-testid="canvas-trends"]');
    expect(canvasEl).toBeTruthy();
    expect(canvasEl.getAttribute('role')).toBe('img');
  });

  it('should toggle accessible table and display formatted economic metrics', () => {
    fixture.componentRef.setInput('series', dummySeries);
    fixture.detectChanges();

    // Table initially hidden
    expect(fixture.nativeElement.querySelector('[data-testid="trends-data-table"]')).toBeNull();

    // Click toggle button
    const toggleBtn = fixture.nativeElement.querySelector('[data-testid="btn-toggle-trends-table"]');
    expect(toggleBtn).toBeTruthy();
    toggleBtn.click();
    fixture.detectChanges();

    // Table now visible
    const tableEl = fixture.nativeElement.querySelector('[data-testid="trends-data-table"]');
    expect(tableEl).toBeTruthy();

    const textContent = tableEl.textContent.replace(/\u00a0/g, ' ');
    expect(textContent).toContain('Abr/26');
    expect(textContent).toContain('13.000,00');
    expect(textContent).toContain('7.800,00');
    expect(textContent).toContain('5.200,00');
  });

  it('should cleanly destroy chart on component teardown without throwing', () => {
    fixture.componentRef.setInput('series', dummySeries);
    fixture.detectChanges();

    expect(() => fixture.destroy()).not.toThrow();
  });
});
