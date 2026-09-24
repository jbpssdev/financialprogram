import { inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  DashboardDebtResponse,
  DashboardInventoryResponse,
  DashboardSalesResponse,
  DashboardSummaryResponse,
} from './dashboard.models';
import { DashboardService } from './dashboard.service';

@Injectable()
export class DashboardStore {
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

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    const year = this.selectedYear();
    const month = this.selectedMonth();

    forkJoin({
      summary: this.dashboardService.getSummary(year, month),
      sales: this.dashboardService.getSales(year, month),
      inventory: this.dashboardService.getInventory(5),
      debt: this.dashboardService.getDebt(),
    }).subscribe({
      next: (results) => {
        this.summary.set(results.summary);
        this.sales.set(results.sales);
        this.inventory.set(results.inventory);
        this.debt.set(results.debt);
        this.initialized.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os dados do painel.');
        this.loading.set(false);
      },
    });
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

    // Only reload period-dependent data (summary and sales)
    this.periodLoading.set(true);
    this.error.set(null);

    forkJoin({
      summary: this.dashboardService.getSummary(year, month),
      sales: this.dashboardService.getSales(year, month),
    }).subscribe({
      next: (results) => {
        this.summary.set(results.summary);
        this.sales.set(results.sales);
        this.periodLoading.set(false);
      },
      error: () => {
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

      forkJoin({
        summary: this.dashboardService.getSummary(year, month),
        sales: this.dashboardService.getSales(year, month),
      }).subscribe({
        next: (results) => {
          this.summary.set(results.summary);
          this.sales.set(results.sales);
          this.periodLoading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível atualizar os dados do período.');
          this.periodLoading.set(false);
        },
      });
    }
  }
}
