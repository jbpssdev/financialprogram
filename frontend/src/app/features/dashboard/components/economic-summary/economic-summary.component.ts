import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrendingUp } from '@ng-icons/lucide';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { DashboardEconomicMetrics } from '../../dashboard.models';
import { formatCurrency } from '../../dashboard.utils';

@Component({
  selector: 'app-economic-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmCardImports, NgIcon],
  providers: [provideIcons({ lucideTrendingUp })],
  template: `
    <div hlmCard class="p-6 bg-card border-border shadow-2xs space-y-4" data-testid="economic-breakdown">
      <div class="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h3 class="text-base font-semibold text-foreground">Resultado Econômico (Competência)</h3>
          <p class="text-xs text-muted-foreground">Apuração de receitas auferidas e custos incorridos</p>
        </div>
        <ng-icon name="lucideTrendingUp" class="size-4 text-muted-foreground" />
      </div>

      <div class="space-y-2.5 text-xs font-mono">
        <div class="flex justify-between items-center py-1">
          <span class="text-muted-foreground font-sans">Receita Bruta</span>
          <span class="font-medium text-foreground">{{ formatCurrency(economic().grossRevenue) }}</span>
        </div>
        <div class="flex justify-between items-center py-1 text-rose-600 dark:text-rose-400">
          <span class="font-sans">(-) Custo Mercadorias Vendidas (CMV)</span>
          <span>-{{ formatCurrency(economic().cogs) }}</span>
        </div>
        <div class="flex justify-between items-center py-1 font-semibold border-t border-border/60 pt-2">
          <span class="font-sans text-foreground">(=) Lucro Bruto</span>
          <span class="text-foreground">{{ formatCurrency(economic().grossProfit) }}</span>
        </div>
        <div class="flex justify-between items-center py-1 text-emerald-600 dark:text-emerald-400">
          <span class="font-sans">(+) Outras Receitas</span>
          <span>+{{ formatCurrency(economic().otherIncomes) }}</span>
        </div>
        <div class="flex justify-between items-center py-1 text-rose-600 dark:text-rose-400">
          <span class="font-sans">(-) Despesas Operacionais (PJ)</span>
          <span>-{{ formatCurrency(economic().businessExpenses) }}</span>
        </div>
        <div class="flex justify-between items-center py-1 text-rose-600 dark:text-rose-400">
          <span class="font-sans">(-) Juros de Empréstimos</span>
          <span>-{{ formatCurrency(economic().loanInterestExpense) }}</span>
        </div>
        <div class="flex justify-between items-center py-1 font-semibold border-t border-border pt-2 text-sm">
          <span class="font-sans text-foreground">(=) Resultado Operacional</span>
          <span class="text-foreground">{{ formatCurrency(economic().operatingResult) }}</span>
        </div>
        <div class="flex justify-between items-center py-1 text-rose-600 dark:text-rose-400">
          <span class="font-sans">(-) Despesas Pessoais (PF)</span>
          <span>-{{ formatCurrency(economic().personalExpenses) }}</span>
        </div>
        <div class="flex justify-between items-center py-1.5 font-bold border-t border-border bg-muted/40 px-2 rounded text-sm">
          <span class="font-sans text-foreground">(=) Resultado Final</span>
          <span class="text-foreground">{{ formatCurrency(economic().resultAfterPersonalExpenses) }}</span>
        </div>
      </div>
    </div>
  `,
})
export class EconomicSummaryComponent {
  readonly economic = input.required<DashboardEconomicMetrics>();

  protected readonly formatCurrency = formatCurrency;
}
