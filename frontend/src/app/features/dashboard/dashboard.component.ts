import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideCheckCircle2,
  lucideClock,
  lucideRefreshCw,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { CashSummaryComponent } from './components/cash-summary/cash-summary.component';
import { DashboardKpisComponent } from './components/dashboard-kpis/dashboard-kpis.component';
import { DebtOverviewComponent } from './components/debt-overview/debt-overview.component';
import { EconomicSummaryComponent } from './components/economic-summary/economic-summary.component';
import { HistorySectionComponent } from './components/history-section/history-section.component';
import { InventoryOverviewComponent } from './components/inventory-overview/inventory-overview.component';
import { SalesOverviewComponent } from './components/sales-overview/sales-overview.component';
import { DashboardStore } from './dashboard.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    HlmCardImports,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    NgIcon,
    DashboardKpisComponent,
    HistorySectionComponent,
    EconomicSummaryComponent,
    CashSummaryComponent,
    SalesOverviewComponent,
    InventoryOverviewComponent,
    DebtOverviewComponent,
  ],
  providers: [
    DashboardStore,
    provideIcons({
      lucideAlertCircle,
      lucideCheckCircle2,
      lucideClock,
      lucideRefreshCw,
    }),
  ],
  template: `
    <div class="space-y-8">
      <!-- ============================================================ -->
      <!-- PAGE HEADER & PERIOD CONTROLS                                 -->
      <!-- ============================================================ -->
      <app-page-header
        title="Dashboard"
        description="Visão geral e acompanhamento das operações financeiras e contábeis."
      >
        <div class="flex flex-wrap items-center gap-3">
          <!-- Closing Status Badge -->
          @if (store.summary(); as summary) {
            @if (summary.closing.isClosed) {
              <span
                hlmBadge
                variant="outline"
                class="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 gap-1.5 py-1 px-2.5 text-xs font-medium"
                data-testid="badge-closing-status"
              >
                <ng-icon name="lucideCheckCircle2" class="size-3.5" />
                <span>Período Fechado (Oficial)</span>
                @if (summary.closing.version) {
                  <span class="opacity-75">v{{ summary.closing.version }}</span>
                }
              </span>
            } @else {
              <span
                hlmBadge
                variant="secondary"
                class="gap-1.5 py-1 px-2.5 text-xs font-medium text-muted-foreground"
                data-testid="badge-closing-status"
              >
                <ng-icon name="lucideClock" class="size-3.5" />
                <span>Período Aberto (Prévia)</span>
              </span>
            }
          }

          <!-- Month Selector -->
          <div class="flex items-center gap-1.5 bg-card border border-border rounded-md px-2.5 py-1 shadow-2xs">
            <label for="select-month" class="sr-only">Mês</label>
            <select
              id="select-month"
              [ngModel]="store.selectedMonth()"
              (ngModelChange)="onMonthChange($event)"
              [disabled]="store.loading() || store.periodLoading()"
              class="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
              data-testid="select-month"
            >
              @for (m of months; track m.value) {
                <option [value]="m.value" class="bg-card text-foreground">
                  {{ m.label }}
                </option>
              }
            </select>
          </div>

          <!-- Year Selector -->
          <div class="flex items-center gap-1.5 bg-card border border-border rounded-md px-2.5 py-1 shadow-2xs">
            <label for="select-year" class="sr-only">Ano</label>
            <select
              id="select-year"
              [ngModel]="store.selectedYear()"
              (ngModelChange)="onYearChange($event)"
              [disabled]="store.loading() || store.periodLoading()"
              class="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
              data-testid="select-year"
            >
              @for (y of years(); track y) {
                <option [value]="y" class="bg-card text-foreground">
                  {{ y }}
                </option>
              }
            </select>
          </div>

          <!-- Refresh Button -->
          <button
            hlmBtn
            variant="outline"
            size="icon-sm"
            (click)="store.retry()"
            [disabled]="store.loading() || store.periodLoading()"
            aria-label="Atualizar dados do período"
            title="Atualizar dados"
            data-testid="btn-refresh"
          >
            <ng-icon
              name="lucideRefreshCw"
              class="size-3.5"
              [ngClass]="{ 'animate-spin': store.loading() || store.periodLoading() }"
            />
          </button>
        </div>
      </app-page-header>

      <!-- ============================================================ -->
      <!-- GLOBAL ERROR BANNER                                           -->
      <!-- ============================================================ -->
      @if (store.error(); as errorMessage) {
        <div
          role="alert"
          class="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between gap-3"
          data-testid="dashboard-error"
        >
          <div class="flex items-center gap-2">
            <ng-icon name="lucideAlertCircle" class="size-5 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            (click)="store.retry()"
            class="shrink-0 text-xs"
            data-testid="btn-retry-error"
          >
            Tentar novamente
          </button>
        </div>
      }

      <!-- ============================================================ -->
      <!-- LOADING SKELETONS                                             -->
      <!-- ============================================================ -->
      @if (store.loading()) {
        <div class="space-y-6" data-testid="dashboard-loading-skeleton">
          <!-- KPI Skeletons -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            @for (i of [1, 2, 3, 4]; track i) {
              <div hlmCard class="p-6 space-y-3">
                <div hlmSkeleton class="h-4 w-28"></div>
                <div hlmSkeleton class="h-8 w-36"></div>
                <div hlmSkeleton class="h-3 w-20"></div>
              </div>
            }
          </div>
          <!-- Block Skeletons -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div hlmCard class="p-6 space-y-4">
              <div hlmSkeleton class="h-6 w-48"></div>
              <div hlmSkeleton class="h-28 w-full"></div>
            </div>
            <div hlmCard class="p-6 space-y-4">
              <div hlmSkeleton class="h-6 w-48"></div>
              <div hlmSkeleton class="h-28 w-full"></div>
            </div>
          </div>
        </div>
      } @else if (store.summary(); as summary) {
        <!-- ============================================================ -->
        <!-- EXECUTIVE KPIS                                                -->
        <!-- ============================================================ -->
        <app-dashboard-kpis [summary]="summary" />

        <!-- ============================================================ -->
        <!-- HISTORICAL EVOLUTION & CHARTS                                 -->
        <!-- ============================================================ -->
        <app-history-section
          [cashFlowSeries]="store.cashFlowSeries()"
          [trendsSeries]="store.trendsSeries()"
          [selectedMonths]="store.historyMonths()"
          [loading]="store.historyLoading()"
          [error]="store.historyError()"
          (horizonChange)="onHorizonChange($event)"
          (retry)="store.retryHistory()"
        />

        <!-- ============================================================ -->
        <!-- ECONOMIC & CASH FLOW DEMONSTRATIVES                           -->
        <!-- ============================================================ -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-labelledby="breakdown-heading">
          <h2 id="breakdown-heading" class="sr-only">Demonstrativos Econômico e Financeiro</h2>
          <app-economic-summary [economic]="summary.economic" />
          <app-cash-summary [cashFlow]="summary.cashFlow" />
        </section>

        <!-- ============================================================ -->
        <!-- SALES SECTION                                                 -->
        <!-- ============================================================ -->
        @if (store.sales(); as sales) {
          <app-sales-overview [sales]="sales" />
        }

        <!-- ============================================================ -->
        <!-- INVENTORY & DEBT POSITION SECTION                            -->
        <!-- ============================================================ -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-labelledby="inventory-debt-heading">
          <h2 id="inventory-debt-heading" class="sr-only">Posição de Estoque e Endividamento</h2>
          @if (store.inventory(); as inventory) {
            <app-inventory-overview [inventory]="inventory" />
          }
          @if (store.debt(); as debt) {
            <app-debt-overview [debt]="debt" />
          }
        </section>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  protected readonly store = inject(DashboardStore);

  readonly months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  readonly years = computed(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  });

  ngOnInit(): void {
    this.store.loadAll();
  }

  onHorizonChange(months: number): void {
    this.store.setHistoryMonths(months);
  }

  onMonthChange(newMonth: string | number): void {
    const month = typeof newMonth === 'string' ? parseInt(newMonth, 10) : newMonth;
    this.store.setPeriod(this.store.selectedYear(), month);
  }

  onYearChange(newYear: string | number): void {
    const year = typeof newYear === 'string' ? parseInt(newYear, 10) : newYear;
    this.store.setPeriod(year, this.store.selectedMonth());
  }
}

