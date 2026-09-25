import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { getChartThemeColors, registerDashboardCharts } from '../../dashboard.chart-config';
import { DashboardTrendsPoint } from '../../dashboard.models';
import {
  formatAxisCurrency,
  formatCurrency,
  formatReferenceMonth,
  isTrendsSeriesEmpty,
} from '../../dashboard.utils';

@Component({
  selector: 'app-trends-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmCardImports, HlmButton, HlmSkeleton],
  template: `
    <div hlmCard class="p-6 h-full flex flex-col justify-between">
      <div>
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 class="text-base font-semibold text-foreground tracking-tight">
              Tendências de Resultado
            </h3>
            <p class="text-xs text-muted-foreground mt-0.5">
              Evolução da receita, lucro bruto e resultado operacional
            </p>
          </div>

          <button
            hlmBtn
            variant="ghost"
            size="sm"
            (click)="showTable.set(!showTable())"
            [attr.aria-expanded]="showTable()"
            aria-controls="trends-table"
            class="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            data-testid="btn-toggle-trends-table"
          >
            {{ showTable() ? 'Ocultar tabela' : 'Ver dados em tabela' }}
          </button>
        </div>

        @if (loading()) {
          <div class="h-64 flex flex-col justify-end gap-3 p-4" data-testid="trends-skeleton">
            <div class="flex items-end gap-4 h-full">
              <div hlmSkeleton class="h-2/3 flex-1 rounded-sm"></div>
              <div hlmSkeleton class="h-3/4 flex-1 rounded-sm"></div>
              <div hlmSkeleton class="h-1/2 flex-1 rounded-sm"></div>
              <div hlmSkeleton class="h-5/6 flex-1 rounded-sm"></div>
              <div hlmSkeleton class="h-3/5 flex-1 rounded-sm"></div>
              <div hlmSkeleton class="h-4/5 flex-1 rounded-sm"></div>
            </div>
            <div hlmSkeleton class="h-4 w-full"></div>
          </div>
        } @else if (isEmpty()) {
          <div
            class="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-muted/20"
            data-testid="trends-empty"
          >
            <p class="text-xs font-medium text-muted-foreground max-w-xs">
              Nenhuma movimentação histórica de resultado registrada para o intervalo selecionado.
            </p>
          </div>
        } @else {
          <div class="relative w-full h-[260px] md:h-[300px]">
            <canvas
              #chartCanvas
              role="img"
              aria-label="Gráfico de tendências de resultado mostrando linhas de receita bruta, lucro bruto, resultado operacional e caixa"
              data-testid="canvas-trends"
            ></canvas>
          </div>
        }

        <!-- Accessible Data Table Alternative -->
        @if (showTable() && !loading() && !isEmpty()) {
          <div
            id="trends-table"
            class="mt-4 border-t border-border pt-4 overflow-x-auto"
            data-testid="trends-data-table"
          >
            <table class="w-full text-xs text-left">
              <caption class="sr-only">Tabela acessível de tendências de resultados mensais</caption>
              <thead>
                <tr class="border-b border-border text-muted-foreground font-medium">
                  <th scope="col" class="py-2 pr-3">Competência</th>
                  <th scope="col" class="py-2 px-3">Status</th>
                  <th scope="col" class="py-2 px-3 text-right">Receita Bruta</th>
                  <th scope="col" class="py-2 px-3 text-right">Lucro Bruto</th>
                  <th scope="col" class="py-2 px-3 text-right">Resultado Oper.</th>
                  <th scope="col" class="py-2 pl-3 text-right">Fluxo Caixa</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                @for (item of series(); track item.referenceMonth) {
                  <tr class="hover:bg-muted/30">
                    <td class="py-1.5 pr-3 font-medium text-foreground">
                      {{ formatMonth(item.referenceMonth) }}
                    </td>
                    <td class="py-1.5 px-3 text-muted-foreground">
                      {{ item.isClosed ? 'Fechado' : 'Prévia' }}
                    </td>
                    <td class="py-1.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                      {{ formatMoney(item.grossRevenue) }}
                    </td>
                    <td class="py-1.5 px-3 text-right text-teal-600 dark:text-teal-400 font-mono">
                      {{ formatMoney(item.grossProfit) }}
                    </td>
                    <td class="py-1.5 px-3 text-right text-blue-600 dark:text-blue-400 font-mono">
                      {{ formatMoney(item.operatingResult) }}
                    </td>
                    <td
                      class="py-1.5 pl-3 text-right font-mono"
                      [ngClass]="{
                        'text-violet-600 dark:text-violet-400': !item.netCashFlow.startsWith('-'),
                        'text-rose-600 dark:text-rose-400': item.netCashFlow.startsWith('-')
                      }"
                    >
                      {{ formatMoney(item.netCashFlow) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class TrendsChartComponent {
  private readonly destroyRef = inject(DestroyRef);
  private chartInstance: Chart | null = null;

  readonly series = input<DashboardTrendsPoint[] | null>(null);
  readonly loading = input<boolean>(false);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  readonly showTable = signal<boolean>(false);
  readonly isEmpty = computed(() => isTrendsSeriesEmpty(this.series()));

  constructor() {
    registerDashboardCharts();

    afterNextRender(() => {
      this.initOrUpdateChart();
    });

    this.destroyRef.onDestroy(() => {
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
    });
  }

  formatMonth(refMonth: string): string {
    return formatReferenceMonth(refMonth);
  }

  formatMoney(val: string): string {
    return formatCurrency(val);
  }

  private initOrUpdateChart(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const data = this.series();

    if (!canvas || !data || this.isEmpty() || this.loading()) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
      return;
    }

    // Guard against headless/JSDOM environments without native canvas support
    if (!canvas.getContext || !canvas.getContext('2d')) {
      return;
    }

    const colors = getChartThemeColors();
    const labels = data.map((d) => formatReferenceMonth(d.referenceMonth));

    // Convert only for visual chart coordinates
    const revenueData = data.map((d) => Number(d.grossRevenue));
    const profitData = data.map((d) => Number(d.grossProfit));
    const operatingData = data.map((d) => Number(d.operatingResult));
    const cashFlowData = data.map((d) => Number(d.netCashFlow));

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Receita Bruta',
            data: revenueData,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: 'rgb(16, 185, 129)',
            tension: 0.25,
          },
          {
            label: 'Lucro Bruto',
            data: profitData,
            borderColor: 'rgb(20, 184, 166)',
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            borderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 5.5,
            pointBackgroundColor: 'rgb(20, 184, 166)',
            tension: 0.25,
          },
          {
            label: 'Resultado Operacional',
            data: operatingData,
            borderColor: 'rgb(37, 99, 235)',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 5.5,
            pointBackgroundColor: 'rgb(37, 99, 235)',
            tension: 0.25,
          },
          {
            label: 'Fluxo Caixa (Líquido)',
            data: cashFlowData,
            borderColor: 'rgb(139, 92, 246)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3.5,
            pointHoverRadius: 5.5,
            pointBackgroundColor: 'rgb(139, 92, 246)',
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              color: colors.foreground,
              font: { size: 11 },
            },
          },
          tooltip: {
            backgroundColor: colors.card,
            titleColor: colors.foreground,
            bodyColor: colors.mutedForeground,
            borderColor: colors.border,
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const point = data[idx];
                if (!point) return '';
                const month = formatReferenceMonth(point.referenceMonth);
                const status = point.isClosed ? 'Fechado' : 'Prévia';
                return `${month} (${status})`;
              },
              // Tooltip always uses pure Decimal string from original point
              label: (context) => {
                const idx = context.dataIndex;
                const point = data[idx];
                if (!point) return '';
                if (context.datasetIndex === 0) {
                  return ` Receita Bruta: ${formatCurrency(point.grossRevenue)}`;
                }
                if (context.datasetIndex === 1) {
                  return ` Lucro Bruto: ${formatCurrency(point.grossProfit)}`;
                }
                if (context.datasetIndex === 2) {
                  return ` Resultado Operacional: ${formatCurrency(point.operatingResult)}`;
                }
                if (context.datasetIndex === 3) {
                  return ` Fluxo Caixa: ${formatCurrency(point.netCashFlow)}`;
                }
                return '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: colors.mutedForeground,
              font: { size: 11 },
            },
          },
          y: {
            grid: {
              color: 'rgba(148, 163, 184, 0.15)',
            },
            ticks: {
              color: colors.mutedForeground,
              font: { size: 10 },
              callback: (value) => formatAxisCurrency(Number(value)),
            },
          },
        },
      },
    };

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    this.chartInstance = new Chart(canvas, config);
  }
}
