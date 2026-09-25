import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import {
  DashboardCashFlowPoint,
  DashboardDebtResponse,
  DashboardInventoryResponse,
  DashboardSalesResponse,
  DashboardSummaryResponse,
  DashboardTrendsPoint,
} from './dashboard.models';
import { DashboardService } from './dashboard.service';

@Injectable()
export class DashboardStore implements OnDestroy {
  private readonly dashboardService = inject(DashboardService);

  private readonly now = new Date();
  readonly selectedYear = signal<number>(this.now.getFullYear());
  readonly selectedMonth = signal<number>(this.now.getMonth() + 1);

  readonly summary = signal<DashboardSummaryResponse | null>(null);
  readonly sales = signal<DashboardSalesResponse | null>(null);
  readonly inventory = signal<DashboardInventoryResponse | null>(null);
  readonly debt = signal<DashboardDebtResponse | null>(null);

  readonly loading = signal<boolean>(false);
  readonly periodLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly initialized = signal<boolean>(false);

  // Phase 2: Historical series & trends signals
  readonly cashFlowSeries = signal<DashboardCashFlowPoint[] | null>(null);
  readonly trendsSeries = signal<DashboardTrendsPoint[] | null>(null);
  readonly historyMonths = signal<number>(6);
  readonly historyLoading = signal<boolean>(false);
  readonly historyError = signal<string | null>(null);

  // Concurrency & generation guards to prevent stale responses from overwriting current state
  private historyRequestId = 0;
  private periodRequestId = 0;
  private loadAllRequestId = 0;

  private historySub?: Subscription;
  private periodSub?: Subscription;
  private loadAllSub?: Subscription;

  ngOnDestroy(): void {
    this.historySub?.unsubscribe();
    this.periodSub?.unsubscribe();
    this.loadAllSub?.unsubscribe();
  }

  loadAll(): void {
    this.loadAllSub?.unsubscribe();
    const requestId = ++this.loadAllRequestId;

    this.loading.set(true);
    this.error.set(null);

    const year = this.selectedYear();
    const month = this.selectedMonth();

    // Trigger history loading in parallel without blocking Phase 1
    this.loadHistory();

    this.loadAllSub = forkJoin({
      summary: this.dashboardService.getSummary(year, month),
      sales: this.dashboardService.getSales(year, month),
      inventory: this.dashboardService.getInventory(5),
      debt: this.dashboardService.getDebt(),
    }).subscribe({
      next: (results) => {
        if (requestId !== this.loadAllRequestId) return;
        this.summary.set(results.summary);
        this.sales.set(results.sales);
        this.inventory.set(results.inventory);
        this.debt.set(results.debt);
        this.initialized.set(true);
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.loadAllRequestId) return;
        this.error.set('Não foi possível carregar os dados do painel.');
        this.loading.set(false);
      },
    });
  }

  loadHistory(): void {
    this.historySub?.unsubscribe();
    const requestId = ++this.historyRequestId;

    this.historyLoading.set(true);
    this.historyError.set(null);

    const months = this.historyMonths();
    const year = this.selectedYear();
    const month = this.selectedMonth();

    this.historySub = forkJoin({
      cashFlow: this.dashboardService.getCashFlow(months, year, month),
      trends: this.dashboardService.getTrends(months, year, month),
    }).subscribe({
      next: (results) => {
        if (requestId !== this.historyRequestId) return;
        this.cashFlowSeries.set(results.cashFlow);
        this.trendsSeries.set(results.trends);
        this.historyLoading.set(false);
      },
      error: () => {
        if (requestId !== this.historyRequestId) return;
        this.historyError.set('Não foi possível carregar as séries históricas.');
        this.historyLoading.set(false);
      },
    });
  }

  setHistoryMonths(months: number): void {
    if (months === this.historyMonths()) {
      return;
    }

    this.historyMonths.set(months);
    this.loadHistory();
  }

  retryHistory(): void {
    this.loadHistory();
  }

  setPeriod(year: number, month: number): void {
    if (year === this.selectedYear() && month === this.selectedMonth()) {
      return;
    }

    this.selectedYear.set(year);
    this.selectedMonth.set(month);

    if (!this.initialized()) {
      this.loadAll();
      return;
    }

    // Only reload period-dependent data (summary, sales, and history anchored to period)
    this.periodLoading.set(true);
    this.error.set(null);

    // Refresh history anchored to the newly selected competence
    this.loadHistory();

    this.periodSub?.unsubscribe();
    const requestId = ++this.periodRequestId;

    this.periodSub = forkJoin({
      summary: this.dashboardService.getSummary(year, month),
      sales: this.dashboardService.getSales(year, month),
    }).subscribe({
      next: (results) => {
        if (requestId !== this.periodRequestId) return;
        this.summary.set(results.summary);
        this.sales.set(results.sales);
        this.periodLoading.set(false);
      },
      error: () => {
        if (requestId !== this.periodRequestId) return;
        this.error.set('Não foi possível atualizar os dados do período selecionado.');
        this.periodLoading.set(false);
      },
    });
  }

  retry(): void {
    if (!this.initialized()) {
      this.loadAll();
    } else {
      const year = this.selectedYear();
      const month = this.selectedMonth();
      this.periodLoading.set(true);
      this.error.set(null);

      if (this.historyError()) {
        this.retryHistory();
      }

      this.periodSub?.unsubscribe();
      const requestId = ++this.periodRequestId;

      this.periodSub = forkJoin({
        summary: this.dashboardService.getSummary(year, month),
        sales: this.dashboardService.getSales(year, month),
      }).subscribe({
        next: (results) => {
          if (requestId !== this.periodRequestId) return;
          this.summary.set(results.summary);
          this.sales.set(results.sales);
          this.periodLoading.set(false);
        },
        error: () => {
          if (requestId !== this.periodRequestId) return;
          this.error.set('Não foi possível atualizar os dados do período.');
          this.periodLoading.set(false);
        },
      });
    }
  }
}

