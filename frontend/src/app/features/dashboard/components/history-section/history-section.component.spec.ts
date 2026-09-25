import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideAlertCircle, lucideRefreshCw } from '@ng-icons/lucide';
import {
  createDummyCashFlowSeries,
  createDummyTrendsSeries,
} from '../../dashboard.testing';
import { HistorySectionComponent } from './history-section.component';

describe('HistorySectionComponent', () => {
  let component: HistorySectionComponent;
  let fixture: ComponentFixture<HistorySectionComponent>;

  const dummyCashFlow = createDummyCashFlowSeries();
  const dummyTrends = createDummyTrendsSeries();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorySectionComponent],
      providers: [
        provideIcons({
          lucideAlertCircle,
          lucideRefreshCw,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistorySectionComponent);
    component = fixture.componentInstance;
  });

  it('should render 6, 12, and 24 months segmented buttons with correct aria-pressed', () => {
    fixture.componentRef.setInput('selectedMonths', 6);
    fixture.detectChanges();

    const btn6 = fixture.nativeElement.querySelector('[data-testid="btn-horizon-6"]');
    const btn12 = fixture.nativeElement.querySelector('[data-testid="btn-horizon-12"]');
    const btn24 = fixture.nativeElement.querySelector('[data-testid="btn-horizon-24"]');

    expect(btn6).toBeTruthy();
    expect(btn12).toBeTruthy();
    expect(btn24).toBeTruthy();

    expect(btn6.getAttribute('aria-pressed')).toBe('true');
    expect(btn12.getAttribute('aria-pressed')).toBe('false');
    expect(btn24.getAttribute('aria-pressed')).toBe('false');

    // Switch to 12
    fixture.componentRef.setInput('selectedMonths', 12);
    fixture.detectChanges();
    expect(btn6.getAttribute('aria-pressed')).toBe('false');
    expect(btn12.getAttribute('aria-pressed')).toBe('true');
  });

  it('should emit horizonChange when a different horizon button is clicked', () => {
    fixture.componentRef.setInput('selectedMonths', 6);
    fixture.detectChanges();

    let emittedMonths: number | null = null;
    component.horizonChange.subscribe((m) => (emittedMonths = m));

    const btn12 = fixture.nativeElement.querySelector('[data-testid="btn-horizon-12"]');
    btn12.click();

    expect(emittedMonths).toBe(12);
  });

  it('should render error banner and emit retry when retry button is clicked', () => {
    fixture.componentRef.setInput('error', 'Falha ao obter histórico');
    fixture.detectChanges();

    const errorBanner = fixture.nativeElement.querySelector('[data-testid="history-error-banner"]');
    expect(errorBanner).toBeTruthy();
    expect(errorBanner.textContent).toContain('Falha ao obter histórico');

    let retryClicked = false;
    component.retry.subscribe(() => (retryClicked = true));

    const retryBtn = fixture.nativeElement.querySelector('[data-testid="btn-retry-history"]');
    expect(retryBtn).toBeTruthy();
    retryBtn.click();

    expect(retryClicked).toBe(true);
  });

  it('should render both child chart components', () => {
    fixture.componentRef.setInput('cashFlowSeries', dummyCashFlow);
    fixture.componentRef.setInput('trendsSeries', dummyTrends);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-cash-flow-chart')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-trends-chart')).toBeTruthy();
  });
});
