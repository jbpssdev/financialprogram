import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideCalendar,
  lucideCheckCircle2,
  lucideClock,
  lucideRefreshCw,
} from '@ng-icons/lucide';
import {
  DashboardDebtResponse,
  DashboardInventoryResponse,
  DashboardSalesResponse,
  DashboardSummaryResponse,
} from './dashboard.models';
import { DashboardComponent } from './dashboard.component';
import { DashboardStore } from './dashboard.store';
import {
  createDummyDebt,
  createDummyInventory,
  createDummySales,
  createDummySummary,
} from './dashboard.testing';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  let mockStore: {
    selectedYear: ReturnType<typeof signal<number>>;
    selectedMonth: ReturnType<typeof signal<number>>;
    summary: ReturnType<typeof signal<DashboardSummaryResponse | null>>;
    sales: ReturnType<typeof signal<DashboardSalesResponse | null>>;
    inventory: ReturnType<typeof signal<DashboardInventoryResponse | null>>;
    debt: ReturnType<typeof signal<DashboardDebtResponse | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    periodLoading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    initialized: ReturnType<typeof signal<boolean>>;
    loadAll: ReturnType<typeof vi.fn>;
    setPeriod: ReturnType<typeof vi.fn>;
    retry: ReturnType<typeof vi.fn>;
  };

  const dummySummary = createDummySummary();
  const dummySales = createDummySales();
  const dummyInventory = createDummyInventory();
  const dummyDebt = createDummyDebt();

  beforeEach(async () => {
    mockStore = {
      selectedYear: signal<number>(2026),
      selectedMonth: signal<number>(9),
      summary: signal<DashboardSummaryResponse | null>(null),
      sales: signal<DashboardSalesResponse | null>(null),
      inventory: signal<DashboardInventoryResponse | null>(null),
      debt: signal<DashboardDebtResponse | null>(null),
      loading: signal<boolean>(false),
      periodLoading: signal<boolean>(false),
      error: signal<string | null>(null),
      initialized: signal<boolean>(false),
      loadAll: vi.fn(),
      setPeriod: vi.fn(),
      retry: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
    })
      .overrideComponent(DashboardComponent, {
        set: {
          providers: [
            { provide: DashboardStore, useValue: mockStore },
            provideIcons({
              lucideAlertCircle,
              lucideCalendar,
              lucideCheckCircle2,
              lucideClock,
              lucideRefreshCw,
            }),
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should call store.loadAll() on initialization', () => {
    fixture.detectChanges();
    expect(mockStore.loadAll).toHaveBeenCalledTimes(1);
  });

  it('should render loading skeleton when store is loading', () => {
    mockStore.loading.set(true);
    fixture.detectChanges();

    const skeletonEl = fixture.nativeElement.querySelector('[data-testid="dashboard-loading-skeleton"]');
    expect(skeletonEl).toBeTruthy();
  });

  it('should render error message and retry button when error occurs', () => {
    mockStore.error.set('Erro de conexão ao carregar painel');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="dashboard-error"]');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Erro de conexão ao carregar painel');

    const retryBtn = fixture.nativeElement.querySelector('[data-testid="btn-retry-error"]');
    expect(retryBtn).toBeTruthy();
    retryBtn.click();
    expect(mockStore.retry).toHaveBeenCalledTimes(1);
  });

  it('should render child block components and metrics when data is present', () => {
    mockStore.summary.set(dummySummary);
    mockStore.sales.set(dummySales);
    mockStore.inventory.set(dummyInventory);
    mockStore.debt.set(dummyDebt);
    fixture.detectChanges();

    // Check presentation components presence
    expect(fixture.nativeElement.querySelector('app-dashboard-kpis')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-economic-summary')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-cash-summary')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-sales-overview')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-inventory-overview')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-debt-overview')).toBeTruthy();

    // Verify deeply rendered values through child components
    const grossRevEl = fixture.nativeElement.querySelector('[data-testid="kpi-gross-revenue"]');
    const normalizedGrossRev = grossRevEl.textContent.replace(/\u00a0/g, ' ');
    expect(normalizedGrossRev).toContain('15.000,00');
    expect(normalizedGrossRev).toContain('+25.00%');

    const operatingResEl = fixture.nativeElement.querySelector('[data-testid="kpi-operating-result"]');
    const normalizedOperatingRes = operatingResEl.textContent.replace(/\u00a0/g, ' ');
    expect(normalizedOperatingRes).toContain('6.300,00');

    const netCashFlowEl = fixture.nativeElement.querySelector('[data-testid="kpi-net-cash-flow"]');
    const normalizedNetCashFlow = netCashFlowEl.textContent.replace(/\u00a0/g, ' ');
    expect(normalizedNetCashFlow).toContain('3.700,00');
    expect(normalizedNetCashFlow).toContain('Sem base de comparação');
  });

  it('should render closing status badge correctly', () => {
    mockStore.summary.set(dummySummary);
    fixture.detectChanges();

    const badgeEl = fixture.nativeElement.querySelector('[data-testid="badge-closing-status"]');
    expect(badgeEl.textContent).toContain('Período Aberto (Prévia)');

    // Closed period
    const closedSummary = {
      ...dummySummary,
      closing: { isClosed: true, version: 1, status: 'CLOSED' as const, closedAt: '2026-10-01' },
    };
    mockStore.summary.set(closedSummary);
    fixture.detectChanges();

    const closedBadgeEl = fixture.nativeElement.querySelector('[data-testid="badge-closing-status"]');
    expect(closedBadgeEl.textContent).toContain('Período Fechado (Oficial)');
    expect(closedBadgeEl.textContent).toContain('v1');
  });

  it('should call store.setPeriod() when month selector changes', () => {
    mockStore.summary.set(dummySummary);
    fixture.detectChanges();

    const monthSelect = fixture.nativeElement.querySelector('[data-testid="select-month"]');
    monthSelect.value = '8';
    monthSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(mockStore.setPeriod).toHaveBeenCalledWith(2026, 8);
  });

  it('should call store.setPeriod() when year selector changes', () => {
    mockStore.summary.set(dummySummary);
    fixture.detectChanges();

    const yearSelect = fixture.nativeElement.querySelector('[data-testid="select-year"]');
    yearSelect.value = '2025';
    yearSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(mockStore.setPeriod).toHaveBeenCalledWith(2025, 9);
  });

  it('should call store.retry() when refresh button is clicked', () => {
    mockStore.summary.set(dummySummary);
    fixture.detectChanges();

    const refreshBtn = fixture.nativeElement.querySelector('[data-testid="btn-refresh"]');
    expect(refreshBtn).toBeTruthy();
    refreshBtn.click();

    expect(mockStore.retry).toHaveBeenCalledTimes(1);
  });
});
