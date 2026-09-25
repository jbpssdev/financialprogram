import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle, lucideRefreshCw } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { DashboardCashFlowPoint, DashboardTrendsPoint } from '../../dashboard.models';
import { CashFlowChartComponent } from '../cash-flow-chart/cash-flow-chart.component';
import { TrendsChartComponent } from '../trends-chart/trends-chart.component';

@Component({
  selector: 'app-history-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HlmButton,
    NgIcon,
    CashFlowChartComponent,
    TrendsChartComponent,
  ],
  providers: [
    provideIcons({
      lucideAlertCircle,
      lucideRefreshCw,
    }),
  ],
  template: `
    <section aria-labelledby="history-section-title" class="space-y-4">
      <!-- Section Header & Horizon Controls -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="history-section-title"
            class="text-lg font-semibold tracking-tight text-foreground"
          >
            Evolução Histórica
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            Acompanhamento das séries financeiras e de resultados retroativas à competência selecionada
          </p>
        </div>

        <!-- Segmented Horizon Selector -->
        <div
          class="inline-flex rounded-lg border border-border p-1 bg-muted/40 shadow-2xs"
          role="group"
          aria-label="Seleção de horizonte temporal"
        >
          @for (horizon of horizonOptions; track horizon.value) {
            <button
              type="button"
              [class]="
                selectedMonths() === horizon.value
                  ? 'bg-background shadow-xs text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground font-normal'
              "
              class="px-3 py-1 rounded-md text-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
              [attr.aria-pressed]="selectedMonths() === horizon.value"
              (click)="onSelectHorizon(horizon.value)"
              [attr.data-testid]="'btn-horizon-' + horizon.value"
            >
              {{ horizon.label }}
            </button>
          }
        </div>
      </div>

      <!-- Isolated Error Banner for History -->
      @if (error(); as errorMessage) {
        <div
          role="alert"
          class="flex items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm"
          data-testid="history-error-banner"
        >
          <div class="flex items-center gap-3">
            <ng-icon name="lucideAlertCircle" class="size-5 shrink-0" />
            <span class="font-medium">{{ errorMessage }}</span>
          </div>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            (click)="retry.emit()"
            class="shrink-0 gap-1.5 text-xs border-destructive/30 hover:bg-destructive/20"
            data-testid="btn-retry-history"
          >
            <ng-icon name="lucideRefreshCw" class="size-3.5" />
            <span>Tentar novamente</span>
          </button>
        </div>
      }

      <!-- Grid of Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-cash-flow-chart
          [series]="cashFlowSeries()"
          [loading]="loading()"
        />

        <app-trends-chart
          [series]="trendsSeries()"
          [loading]="loading()"
        />
      </div>
    </section>
  `,
})
export class HistorySectionComponent {
  readonly cashFlowSeries = input<DashboardCashFlowPoint[] | null>(null);
  readonly trendsSeries = input<DashboardTrendsPoint[] | null>(null);
  readonly selectedMonths = input<number>(6);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);

  readonly horizonChange = output<number>();
  readonly retry = output<void>();

  readonly horizonOptions = [
    { value: 6, label: '6 meses' },
    { value: 12, label: '12 meses' },
    { value: 24, label: '24 meses' },
  ];

  onSelectHorizon(months: number): void {
    if (months !== this.selectedMonths()) {
      this.horizonChange.emit(months);
    }
  }
}
