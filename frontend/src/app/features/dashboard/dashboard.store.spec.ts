import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  DashboardCashFlowPoint,
  DashboardDebtResponse,
  DashboardInventoryResponse,
  DashboardSalesResponse,
  DashboardSummaryResponse,
  DashboardTrendsPoint,
} from './dashboard.models';
import { DashboardService } from './dashboard.service';
import { DashboardStore } from './dashboard.store';
import {
  createDummyCashFlowSeries,
  createDummyDebt,
  createDummyInventory,
  createDummySales,
  createDummySummary,
  createDummyTrendsSeries,
} from './dashboard.testing';

describe('DashboardStore', () => {
  let store: DashboardStore;
  let serviceMock: {
    getSummary: ReturnType<typeof vi.fn>;
    getSales: ReturnType<typeof vi.fn>;
    getInventory: ReturnType<typeof vi.fn>;
    getDebt: ReturnType<typeof vi.fn>;
    getCashFlow: ReturnType<typeof vi.fn>;
    getTrends: ReturnType<typeof vi.fn>;
  };

  const dummySummary = createDummySummary();
  const dummySales = createDummySales();
  const dummyInventory = createDummyInventory();
  const dummyDebt = createDummyDebt();
  const dummyCashFlow = createDummyCashFlowSeries();
  const dummyTrends = createDummyTrendsSeries();

  beforeEach(() => {
    serviceMock = {
      getSummary: vi.fn().mockReturnValue(of(dummySummary)),
      getSales: vi.fn().mockReturnValue(of(dummySales)),
      getInventory: vi.fn().mockReturnValue(of(dummyInventory)),
      getDebt: vi.fn().mockReturnValue(of(dummyDebt)),
      getCashFlow: vi.fn().mockReturnValue(of(dummyCashFlow)),
      getTrends: vi.fn().mockReturnValue(of(dummyTrends)),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        { provide: DashboardService, useValue: serviceMock },
      ],
    });

    store = TestBed.inject(DashboardStore);
  });

  it('should initialize with default current month/year, null metrics and 6 history months', () => {
    expect(store.selectedYear()).toBeGreaterThanOrEqual(2025);
    expect(store.selectedMonth()).toBeGreaterThanOrEqual(1);
    expect(store.selectedMonth()).toBeLessThanOrEqual(12);
    expect(store.summary()).toBeNull();
    expect(store.sales()).toBeNull();
    expect(store.inventory()).toBeNull();
    expect(store.debt()).toBeNull();
    expect(store.cashFlowSeries()).toBeNull();
    expect(store.trendsSeries()).toBeNull();
    expect(store.historyMonths()).toBe(6);
    expect(store.historyLoading()).toBe(false);
    expect(store.historyError()).toBeNull();
    expect(store.initialized()).toBe(false);
  });

  it('should load all metrics and history in parallel on loadAll() and update signals', () => {
    store.loadAll();

    expect(serviceMock.getSummary).toHaveBeenCalledTimes(1);
    expect(serviceMock.getSales).toHaveBeenCalledTimes(1);
    expect(serviceMock.getInventory).toHaveBeenCalledTimes(1);
    expect(serviceMock.getDebt).toHaveBeenCalledTimes(1);
    expect(serviceMock.getCashFlow).toHaveBeenCalledTimes(1);
    expect(serviceMock.getTrends).toHaveBeenCalledTimes(1);

    expect(store.summary()).toEqual(dummySummary);
    expect(store.sales()).toEqual(dummySales);
    expect(store.inventory()).toEqual(dummyInventory);
    expect(store.debt()).toEqual(dummyDebt);
    expect(store.cashFlowSeries()).toEqual(dummyCashFlow);
    expect(store.trendsSeries()).toEqual(dummyTrends);
    expect(store.initialized()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.historyLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.historyError()).toBeNull();
  });

  it('should set error signal if loadAll() fails on main metrics without failing history', () => {
    serviceMock.getSummary.mockReturnValue(throwError(() => new Error('Server error')));

    store.loadAll();

    expect(store.error()).toBe('Não foi possível carregar os dados do painel.');
    expect(store.loading()).toBe(false);
    // History succeeded independently
    expect(store.cashFlowSeries()).toEqual(dummyCashFlow);
    expect(store.historyError()).toBeNull();
  });

  it('should isolate historyError without failing main Phase 1 metrics', () => {
    serviceMock.getCashFlow.mockReturnValue(throwError(() => new Error('History error')));

    store.loadAll();

    expect(store.historyError()).toBe('Não foi possível carregar as séries históricas.');
    expect(store.historyLoading()).toBe(false);
    // Main dashboard succeeded
    expect(store.summary()).toEqual(dummySummary);
    expect(store.error()).toBeNull();
  });

  it('should change horizon to 12 or 24 months and reload only historical series', () => {
    store.loadAll();
    expect(serviceMock.getCashFlow).toHaveBeenCalledTimes(1);
    expect(serviceMock.getSummary).toHaveBeenCalledTimes(1);

    store.setHistoryMonths(12);

    expect(store.historyMonths()).toBe(12);
    expect(serviceMock.getCashFlow).toHaveBeenCalledTimes(2);
    expect(serviceMock.getTrends).toHaveBeenCalledTimes(2);

    // Main endpoints NOT called again
    expect(serviceMock.getSummary).toHaveBeenCalledTimes(1);
    expect(serviceMock.getSales).toHaveBeenCalledTimes(1);
    expect(serviceMock.getInventory).toHaveBeenCalledTimes(1);
    expect(serviceMock.getDebt).toHaveBeenCalledTimes(1);

    // Change to 24 months
    store.setHistoryMonths(24);
    expect(store.historyMonths()).toBe(24);
    expect(serviceMock.getCashFlow).toHaveBeenCalledTimes(3);
    expect(serviceMock.getTrends).toHaveBeenCalledTimes(3);
    expect(serviceMock.getSummary).toHaveBeenCalledTimes(1);
  });

  it('should not reload history if setHistoryMonths is called with current horizon', () => {
    store.loadAll();
    expect(serviceMock.getCashFlow).toHaveBeenCalledTimes(1);

    store.setHistoryMonths(6);
    expect(serviceMock.getCashFlow).toHaveBeenCalledTimes(1);
  });

  it('should reload summary, sales, and history anchored to period on setPeriod() while preserving inventory and debt', () => {
    store.loadAll();
    expect(serviceMock.getInventory).toHaveBeenCalledTimes(1);
    expect(serviceMock.getDebt).toHaveBeenCalledTimes(1);

    const updatedSummary = createDummySummary({ period: { year: 2026, month: 3, referenceMonth: '2026-03' } });
    const updatedSales = createDummySales({ period: { year: 2026, month: 3, referenceMonth: '2026-03' } });
    serviceMock.getSummary.mockReturnValue(of(updatedSummary));
    serviceMock.getSales.mockReturnValue(of(updatedSales));

    store.setPeriod(2026, 3);

    expect(store.selectedYear()).toBe(2026);
    expect(store.selectedMonth()).toBe(3);

    // Summary, sales, and history called again with anchor year 2026, month 3
    expect(serviceMock.getSummary).toHaveBeenCalledTimes(2);
    expect(serviceMock.getSales).toHaveBeenCalledTimes(2);
    expect(serviceMock.getCashFlow).toHaveBeenCalledWith(6, 2026, 3);
    expect(serviceMock.getTrends).toHaveBeenCalledWith(6, 2026, 3);

    // Inventory and debt NOT called again
    expect(serviceMock.getInventory).toHaveBeenCalledTimes(1);
    expect(serviceMock.getDebt).toHaveBeenCalledTimes(1);

    expect(store.summary()).toEqual(updatedSummary);
    expect(store.sales()).toEqual(updatedSales);
    expect(store.periodLoading()).toBe(false);
  });

  it('should retry history loading on retryHistory()', () => {
    serviceMock.getCashFlow.mockReturnValueOnce(throwError(() => new Error('fail')));
    store.loadHistory();
    expect(store.historyError()).toBeTruthy();

    serviceMock.getCashFlow.mockReturnValue(of(dummyCashFlow));
    store.retryHistory();

    expect(store.historyError()).toBeNull();
    expect(store.cashFlowSeries()).toEqual(dummyCashFlow);
  });

  describe('Concurrency & Race Condition Protection', () => {
    it('should discard obsolete history response when user changes horizon quickly (24M -> 6M race condition)', () => {
      const slow24CashFlow$ = new Subject<DashboardCashFlowPoint[]>();
      const slow24Trends$ = new Subject<DashboardTrendsPoint[]>();
      const fast6CashFlow$ = new Subject<DashboardCashFlowPoint[]>();
      const fast6Trends$ = new Subject<DashboardTrendsPoint[]>();

      serviceMock.getCashFlow.mockImplementation((months: number) => {
        if (months === 24) return slow24CashFlow$.asObservable();
        if (months === 6) return fast6CashFlow$.asObservable();
        return of([]);
      });
      serviceMock.getTrends.mockImplementation((months: number) => {
        if (months === 24) return slow24Trends$.asObservable();
        if (months === 6) return fast6Trends$.asObservable();
        return of([]);
      });

      // User initiates 24 months
      store.setHistoryMonths(24);
      expect(store.historyMonths()).toBe(24);
      expect(store.historyLoading()).toBe(true);

      // User quickly changes back to 6 months before 24M finishes
      store.setHistoryMonths(6);
      expect(store.historyMonths()).toBe(6);
      expect(store.historyLoading()).toBe(true);

      // 6M response arrives first
      const series6 = createDummyCashFlowSeries();
      const trends6 = createDummyTrendsSeries();
      fast6CashFlow$.next(series6);
      fast6CashFlow$.complete();
      fast6Trends$.next(trends6);
      fast6Trends$.complete();

      // State is updated with 6M
      expect(store.cashFlowSeries()).toEqual(series6);
      expect(store.trendsSeries()).toEqual(trends6);
      expect(store.historyLoading()).toBe(false);

      // Obsolete 24M response arrives later
      const series24: DashboardCashFlowPoint[] = [
        ...series6,
        { referenceMonth: '2024-01', isClosed: true, inflows: '9999.00', outflows: '8888.00', netCashFlow: '1111.00' },
      ];
      slow24CashFlow$.next(series24);
      slow24CashFlow$.complete();
      slow24Trends$.next(trends6);
      slow24Trends$.complete();

      // MUST NOT overwrite with stale 24M data
      expect(store.cashFlowSeries()).toEqual(series6);
      expect(store.historyMonths()).toBe(6);
      expect(store.historyLoading()).toBe(false);
    });

    it('should discard obsolete period response when user changes competence quickly (March -> Feb race condition)', () => {
      store.loadAll(); // initialize

      const slowMarchSummary$ = new Subject<DashboardSummaryResponse>();
      const slowMarchSales$ = new Subject<DashboardSalesResponse>();
      const fastFebSummary$ = new Subject<DashboardSummaryResponse>();
      const fastFebSales$ = new Subject<DashboardSalesResponse>();

      serviceMock.getSummary.mockImplementation((_year: number, month: number) => {
        if (month === 3) return slowMarchSummary$.asObservable();
        if (month === 2) return fastFebSummary$.asObservable();
        return of(dummySummary);
      });
      serviceMock.getSales.mockImplementation((_year: number, month: number) => {
        if (month === 3) return slowMarchSales$.asObservable();
        if (month === 2) return fastFebSales$.asObservable();
        return of(dummySales);
      });

      // Switch to March
      store.setPeriod(2026, 3);
      expect(store.selectedMonth()).toBe(3);
      expect(store.periodLoading()).toBe(true);

      // Quickly switch to February
      store.setPeriod(2026, 2);
      expect(store.selectedMonth()).toBe(2);
      expect(store.periodLoading()).toBe(true);

      // February arrives first
      const febSummary = createDummySummary({ period: { year: 2026, month: 2, referenceMonth: '2026-02' } });
      const febSales = createDummySales({ period: { year: 2026, month: 2, referenceMonth: '2026-02' } });
      fastFebSummary$.next(febSummary);
      fastFebSummary$.complete();
      fastFebSales$.next(febSales);
      fastFebSales$.complete();

      expect(store.summary()).toEqual(febSummary);
      expect(store.sales()).toEqual(febSales);
      expect(store.periodLoading()).toBe(false);

      // March arrives later
      const marchSummary = createDummySummary({ period: { year: 2026, month: 3, referenceMonth: '2026-03' } });
      const marchSales = createDummySales({ period: { year: 2026, month: 3, referenceMonth: '2026-03' } });
      slowMarchSummary$.next(marchSummary);
      slowMarchSummary$.complete();
      slowMarchSales$.next(marchSales);
      slowMarchSales$.complete();

      // MUST NOT overwrite with stale March data
      expect(store.summary()).toEqual(febSummary);
      expect(store.sales()).toEqual(febSales);
      expect(store.selectedMonth()).toBe(2);
      expect(store.periodLoading()).toBe(false);
    });

    it('should ignore an obsolete error from a previous request generation if newer request succeeded', () => {
      const slowError$ = new Subject<DashboardCashFlowPoint[]>();
      const fastSuccess$ = new Subject<DashboardCashFlowPoint[]>();

      serviceMock.getCashFlow.mockImplementation((months: number) => {
        if (months === 24) return slowError$.asObservable();
        if (months === 6) return fastSuccess$.asObservable();
        return of([]);
      });

      store.setHistoryMonths(24);
      store.setHistoryMonths(6);

      // Newer 6M succeeds
      fastSuccess$.next(dummyCashFlow);
      fastSuccess$.complete();

      expect(store.historyError()).toBeNull();
      expect(store.historyLoading()).toBe(false);

      // Obsolete 24M errors
      slowError$.error(new Error('Slow 24M network timeout'));

      // Error must NOT overwrite success
      expect(store.historyError()).toBeNull();
      expect(store.historyLoading()).toBe(false);
    });

    it('should clean up subscriptions on ngOnDestroy', () => {
      const pending$ = new Subject<DashboardCashFlowPoint[]>();
      serviceMock.getCashFlow.mockReturnValue(pending$.asObservable());

      store.loadHistory();
      expect(pending$.observed).toBe(true);

      store.ngOnDestroy();
      expect(pending$.observed).toBe(false);
    });
  });
});

