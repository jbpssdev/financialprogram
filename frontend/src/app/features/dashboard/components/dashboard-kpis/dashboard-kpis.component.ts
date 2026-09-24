import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownRight,
  lucideArrowUpRight,
} from '@ng-icons/lucide';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { DashboardSummaryResponse } from '../../dashboard.models';
import { formatCurrency, formatPercentageChange } from '../../dashboard.utils';

@Component({
  selector: 'app-dashboard-kpis',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmCardImports, NgIcon],
  providers: [
    provideIcons({
      lucideArrowDownRight,
      lucideArrowUpRight,
    }),
  ],
  template: `
    <section aria-labelledby="kpi-section-heading">
      <h2 id="kpi-section-heading" class="sr-only">Indicadores Chave de Desempenho</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Receita Bruta -->
        <div hlmCard class="p-5 bg-card border-border shadow-2xs space-y-1.5" data-testid="kpi-gross-revenue">
          <p class="text-xs font-medium text-muted-foreground">Receita Bruta</p>
          <div class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {{ formatCurrency(summary().economic.grossRevenue) }}
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            @if (summary().comparisonWithPreviousMonth.grossRevenue.percentageChange !== null) {
              <span
                class="font-medium flex items-center"
                [ngClass]="{
                  'text-emerald-600 dark:text-emerald-400': (summary().comparisonWithPreviousMonth.grossRevenue.percentageChange ?? 0) >= 0,
                  'text-rose-600 dark:text-rose-400': (summary().comparisonWithPreviousMonth.grossRevenue.percentageChange ?? 0) < 0
                }"
              >
                @if ((summary().comparisonWithPreviousMonth.grossRevenue.percentageChange ?? 0) >= 0) {
                  <ng-icon name="lucideArrowUpRight" class="size-3.5" />
                } @else {
                  <ng-icon name="lucideArrowDownRight" class="size-3.5" />
                }
                {{ formatPercentageChange(summary().comparisonWithPreviousMonth.grossRevenue.percentageChange) }}
              </span>
            } @else {
              <span class="text-muted-foreground text-[11px]">
                {{ formatPercentageChange(null) }}
              </span>
            }
            <span class="text-muted-foreground text-[11px]">vs mês anterior</span>
          </div>
        </div>

        <!-- Card 2: Lucro Bruto -->
        <div hlmCard class="p-5 bg-card border-border shadow-2xs space-y-1.5" data-testid="kpi-gross-profit">
          <p class="text-xs font-medium text-muted-foreground">Lucro Bruto</p>
          <div class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {{ formatCurrency(summary().economic.grossProfit) }}
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            @if (summary().comparisonWithPreviousMonth.grossProfit.percentageChange !== null) {
              <span
                class="font-medium flex items-center"
                [ngClass]="{
                  'text-emerald-600 dark:text-emerald-400': (summary().comparisonWithPreviousMonth.grossProfit.percentageChange ?? 0) >= 0,
                  'text-rose-600 dark:text-rose-400': (summary().comparisonWithPreviousMonth.grossProfit.percentageChange ?? 0) < 0
                }"
              >
                @if ((summary().comparisonWithPreviousMonth.grossProfit.percentageChange ?? 0) >= 0) {
                  <ng-icon name="lucideArrowUpRight" class="size-3.5" />
                } @else {
                  <ng-icon name="lucideArrowDownRight" class="size-3.5" />
                }
                {{ formatPercentageChange(summary().comparisonWithPreviousMonth.grossProfit.percentageChange) }}
              </span>
            } @else {
              <span class="text-muted-foreground text-[11px]">
                {{ formatPercentageChange(null) }}
              </span>
            }
            <span class="text-muted-foreground text-[11px]">vs mês anterior</span>
          </div>
        </div>

        <!-- Card 3: Resultado Operacional -->
        <div hlmCard class="p-5 bg-card border-border shadow-2xs space-y-1.5" data-testid="kpi-operating-result">
          <p class="text-xs font-medium text-muted-foreground">Resultado Operacional</p>
          <div
            class="text-xl sm:text-2xl font-bold tracking-tight"
            [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': !summary().economic.operatingResult.startsWith('-') && summary().economic.operatingResult !== '0.00',
              'text-rose-600 dark:text-rose-400': summary().economic.operatingResult.startsWith('-'),
              'text-foreground': summary().economic.operatingResult === '0.00'
            }"
          >
            {{ formatCurrency(summary().economic.operatingResult) }}
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            @if (summary().comparisonWithPreviousMonth.operatingResult.percentageChange !== null) {
              <span
                class="font-medium flex items-center"
                [ngClass]="{
                  'text-emerald-600 dark:text-emerald-400': (summary().comparisonWithPreviousMonth.operatingResult.percentageChange ?? 0) >= 0,
                  'text-rose-600 dark:text-rose-400': (summary().comparisonWithPreviousMonth.operatingResult.percentageChange ?? 0) < 0
                }"
              >
                @if ((summary().comparisonWithPreviousMonth.operatingResult.percentageChange ?? 0) >= 0) {
                  <ng-icon name="lucideArrowUpRight" class="size-3.5" />
                } @else {
                  <ng-icon name="lucideArrowDownRight" class="size-3.5" />
                }
                {{ formatPercentageChange(summary().comparisonWithPreviousMonth.operatingResult.percentageChange) }}
              </span>
            } @else {
              <span class="text-muted-foreground text-[11px]">
                {{ formatPercentageChange(null) }}
              </span>
            }
            <span class="text-muted-foreground text-[11px]">vs mês anterior</span>
          </div>
        </div>

        <!-- Card 4: Fluxo Líquido de Caixa -->
        <div hlmCard class="p-5 bg-card border-border shadow-2xs space-y-1.5" data-testid="kpi-net-cash-flow">
          <p class="text-xs font-medium text-muted-foreground">Fluxo Líquido de Caixa</p>
          <div
            class="text-xl sm:text-2xl font-bold tracking-tight"
            [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': !summary().cashFlow.netCashFlow.startsWith('-') && summary().cashFlow.netCashFlow !== '0.00',
              'text-rose-600 dark:text-rose-400': summary().cashFlow.netCashFlow.startsWith('-'),
              'text-foreground': summary().cashFlow.netCashFlow === '0.00'
            }"
          >
            {{ formatCurrency(summary().cashFlow.netCashFlow) }}
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            @if (summary().comparisonWithPreviousMonth.netCashFlow.percentageChange !== null) {
              <span
                class="font-medium flex items-center"
                [ngClass]="{
                  'text-emerald-600 dark:text-emerald-400': (summary().comparisonWithPreviousMonth.netCashFlow.percentageChange ?? 0) >= 0,
                  'text-rose-600 dark:text-rose-400': (summary().comparisonWithPreviousMonth.netCashFlow.percentageChange ?? 0) < 0
                }"
              >
                @if ((summary().comparisonWithPreviousMonth.netCashFlow.percentageChange ?? 0) >= 0) {
                  <ng-icon name="lucideArrowUpRight" class="size-3.5" />
                } @else {
                  <ng-icon name="lucideArrowDownRight" class="size-3.5" />
                }
                {{ formatPercentageChange(summary().comparisonWithPreviousMonth.netCashFlow.percentageChange) }}
              </span>
            } @else {
              <span class="text-muted-foreground text-[11px]">
                {{ formatPercentageChange(null) }}
              </span>
            }
            <span class="text-muted-foreground text-[11px]">vs mês anterior</span>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class DashboardKpisComponent {
  readonly summary = input.required<DashboardSummaryResponse>();

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatPercentageChange = formatPercentageChange;
}
