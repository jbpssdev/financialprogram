import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle, lucideDollarSign } from '@ng-icons/lucide';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { DashboardDebtResponse } from '../../dashboard.models';
import { formatCurrency, formatDateOnly } from '../../dashboard.utils';

@Component({
  selector: 'app-debt-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmCardImports, NgIcon],
  providers: [provideIcons({ lucideAlertTriangle, lucideDollarSign })],
  template: `
    <div hlmCard class="p-6 bg-card border-border shadow-2xs space-y-4" data-testid="debt-block">
      <div class="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h3 class="text-base font-semibold text-foreground">Passivo Financeiro (Empréstimos)</h3>
          <p class="text-xs text-muted-foreground">Posição consolidada e cronograma de vencimentos</p>
        </div>
        <ng-icon name="lucideDollarSign" class="size-4 text-muted-foreground" />
      </div>

      <div class="grid grid-cols-3 gap-2 py-2">
        <div class="bg-muted/40 p-3 rounded-md text-center">
          <span class="text-[11px] text-muted-foreground block">Empréstimos Ativos</span>
          <strong class="text-sm font-semibold text-foreground">{{ debt().activeLoansCount }}</strong>
        </div>
        <div class="bg-muted/40 p-3 rounded-md text-center">
          <span class="text-[11px] text-muted-foreground block">Saldo Devedor</span>
          <strong class="text-sm font-semibold text-foreground">{{ formatCurrency(debt().totalRemainingPrincipal) }}</strong>
        </div>
        <div class="bg-muted/40 p-3 rounded-md text-center">
          <span class="text-[11px] text-muted-foreground block">Parcelas em Atraso</span>
          <strong
            class="text-sm font-semibold"
            [ngClass]="{
              'text-rose-600 dark:text-rose-400': debt().overdueInstallmentsCount > 0,
              'text-foreground': debt().overdueInstallmentsCount === 0
            }"
          >
            {{ debt().overdueInstallmentsCount }}
          </strong>
        </div>
      </div>

      <!-- Overdue Alert if present -->
      @if (debt().overdueInstallmentsCount > 0) {
        <div class="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center justify-between" data-testid="overdue-alert">
          <div class="flex items-center gap-2">
            <ng-icon name="lucideAlertTriangle" class="size-4" />
            <span>Total vencido não liquidado:</span>
          </div>
          <strong class="font-mono">{{ formatCurrency(debt().totalOverdueAmount) }}</strong>
        </div>
      }

      <!-- Upcoming Installments List -->
      @if (debt().upcomingInstallments.length > 0) {
        <div class="space-y-2 pt-1">
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próximos Vencimentos</h4>
          <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            @for (inst of debt().upcomingInstallments.slice(0, 4); track inst.installmentId) {
              <div class="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                <div>
                  <span class="font-medium text-foreground block">{{ inst.lenderName }} (Parc. {{ inst.installmentNumber }})</span>
                  <span class="text-[11px] text-muted-foreground">Vencimento: {{ formatDateOnly(inst.dueDate) }}</span>
                </div>
                <span class="font-mono font-semibold text-foreground">{{ formatCurrency(inst.expectedAmount) }}</span>
              </div>
            }
          </div>
        </div>
      } @else if (debt().activeLoansCount === 0) {
        <div class="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded" data-testid="empty-loans">
          Não há empréstimos em aberto no momento.
        </div>
      }
    </div>
  `,
})
export class DebtOverviewComponent {
  readonly debt = input.required<DashboardDebtResponse>();

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateOnly = formatDateOnly;
}
