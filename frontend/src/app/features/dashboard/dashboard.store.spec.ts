import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  DashboardDebtResponse,
  DashboardInventoryResponse,
  DashboardSalesResponse,
  DashboardSummaryResponse,
} from './dashboard.models';
import { DashboardService } from './dashboard.service';
import { DashboardStore } from './dashboard.store';

describe('DashboardStore', () => {
  let store: DashboardStore;
  let serviceMock: {
    getSummary: ReturnType<typeof vi.fn>;
    getSales: ReturnType<typeof vi.fn>;
    getInventory: ReturnType<typeof vi.fn>;
    getDebt: ReturnType<typeof vi.fn>;
  };

  const dummySummary = {
    period: { year: 2026, month: 9, referenceMonth: '2026-09' },
    closing: { isClosed: false, version: null, status: null, closedAt: null },
    economic: { grossRevenue: '1000.00', grossProfit: '600.00', operatingResult: '400.00' },
  } as unknown as DashboardSummaryResponse;

  const dummySales = {
    period: { year: 2026, month: 9, referenceMonth: '2026-09' },
    salesSummary: { completedSalesCount: 10, grossRevenue: '1000.00' },
  } as unknown as DashboardSalesResponse;

  const dummyInventory = {
    activePhysicalProductsCount: 15,
    totalStockValue: '5000.00',
  } as unknown as DashboardInventoryResponse;

  const dummyDebt = {
    totalOriginalPrincipal: '20000.00',
    totalRemainingPrincipal: '12000.00',
  } as unknown as DashboardDebtResponse;

  beforeEach(() => {
    serviceMock = {
      getSummary: vi.fn().mockReturnValue(of(dummySummary)),
      getSales: vi.fn().mockReturnValue(of(dummySales)),
      getInventory: vi.fn().mockReturnValue(of(dummyInventory)),
      getDebt: vi.fn().mockReturnValue(of(dummyDebt)),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        { provide: DashboardService, useValue: serviceMock },
      ],
    });

    store = TestBed.inject(DashboardStore);
  });

  it('should initialize with default current month/year and null metrics', () => {
    expect(store.selectedYear()).toBeGreaterThanOrEqual(2025);
    expect(store.selectedMonth()).toBeGreaterThanOrEqual(1);
    expect(store.selectedMonth()).toBeLessThanOrEqual(12);
    expect(store.summary()).toBeNull();
    expect(store.sales()).toBeNull();
    expect(store.inventory()).toBeNull();
    expect(store.debt()).toBeNull();
    expect(store.initialized()).toBe(false);
  });

  it('should load all metrics in parallel on loadAll() and update signals', () => {
    store.loadAll();

    expect(serviceMock.getSummary).toHaveBeenCalledTimes(1);
    expect(serviceMock.getSales).toHaveBeenCalledTimes(1);
    expect(serviceMock.getInventory).toHaveBeenCalledTimes(1);
    expect(serviceMock.getDebt).toHaveBeenCalledTimes(1);

    expect(store.summary()).toEqual(dummySummary);
    expect(store.sales()).toEqual(dummySales);
    expect(store.inventory()).toEqual(dummyInventory);
    expect(store.debt()).toEqual(dummyDebt);
    expect(store.initialized()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should set error signal if loadAll() fails', () => {
    serviceMock.getSummary.mockReturnValue(throwError(() => new Error('Server error')));

    store.loadAll();

    expect(store.error()).toBe('Não foi possível carregar os dados do painel.');
    expect(store.loading()).toBe(false);
  });

  it('should reload only summary and sales on setPeriod() when already initialized', () => {
    store.loadAll();
    expect(serviceMock.getInventory).toHaveBeenCalledTimes(1);
    expect(serviceMock.getDebt).toHaveBeenCalledTimes(1);

    const updatedSummary = { ...dummySummary, period: { year: 2026, month: 8, referenceMonth: '2026-08' } } as unknown as DashboardSummaryResponse;
    const updatedSales = { ...dummySales, period: { year: 2026, month: 8, referenceMonth: '2026-08' } } as unknown as DashboardSalesResponse;
    serviceMock.getSummary.mockReturnValue(of(updatedSummary));
    serviceMock.getSales.mockReturnValue(of(updatedSales));

    store.setPeriod(2026, 8);

    expect(store.selectedYear()).toBe(2026);
    expect(store.selectedMonth()).toBe(8);

    // Summary and sales called again
    expect(serviceMock.getSummary).toHaveBeenCalledTimes(2);
    expect(serviceMock.getSales).toHaveBeenCalledTimes(2);

    // Inventory and debt NOT called again
    expect(serviceMock.getInventory).toHaveBeenCalledTimes(1);
    expect(serviceMock.getDebt).toHaveBeenCalledTimes(1);

    expect(store.summary()).toEqual(updatedSummary);
    expect(store.sales()).toEqual(updatedSales);
    expect(store.periodLoading()).toBe(false);
  });

  it('should not reload if setPeriod() is called with current year and month', () => {
    store.loadAll();
    const currentYear = store.selectedYear();
    const currentMonth = store.selectedMonth();

    store.setPeriod(currentYear, currentMonth);

    expect(serviceMock.getSummary).toHaveBeenCalledTimes(1);
    expect(serviceMock.getSales).toHaveBeenCalledTimes(1);
  });

  it('should retry loading on retry()', () => {
    serviceMock.getSummary.mockReturnValueOnce(throwError(() => new Error('fail')));
    store.loadAll();
    expect(store.error()).toBeTruthy();

    serviceMock.getSummary.mockReturnValue(of(dummySummary));
    store.retry();

    expect(store.summary()).toEqual(dummySummary);
    expect(store.error()).toBeNull();
  });
});
