import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideWallet } from '@ng-icons/lucide';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { DashboardCashFlowMetrics } from '../../dashboard.models';
import { formatCurrency } from '../../dashboard.utils';

@Component({
  selector: 'app-cash-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmCardImports, NgIcon],
  providers: [provideIcons({ lucideWallet })],
  template: `
    <div hlmCard class="p-6 bg-card border-border shadow-2xs space-y-4" data-testid="cash-flow-breakdown">
      <div class="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h3 class="text-base font-semibold text-foreground">Fluxo de Caixa Realizado</h3>
          <p class="text-xs text-muted-foreground">Entradas e saídas efetivamente liquidadas no período</p>
        </div>
        <ng-icon name="lucideWallet" class="size-4 text-muted-foreground" />
      </div>

      <div class="space-y-2.5 text-xs font-mono">
        <div class="space-y-1">
          <div class="flex justify-between items-center py-1 font-medium text-emerald-600 dark:text-emerald-400">
            <span class="font-sans">(+) Total de Entradas</span>
            <span>{{ formatCurrency(cashFlow().totalInflows) }}</span>
          </div>
          <div class="pl-3 space-y-0.5 text-[11px] text-muted-foreground font-sans">
            <div class="flex justify-between">
              <span>• Vendas Recebidas:</span>
              <span>{{ formatCurrency(cashFlow().salesCashCollected) }}</span>
            </div>
            <div class="flex justify-between">
              <span>• Outras Receitas Recebidas:</span>
              <span>{{ formatCurrency(cashFlow().otherIncomesCollected) }}</span>
            </div>
            <div class="flex justify-between">
              <span>• Captação de Empréstimos:</span>
              <span>{{ formatCurrency(cashFlow().loanProceeds) }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-1 border-t border-border/60 pt-2">
          <div class="flex justify-between items-center py-1 font-medium text-rose-600 dark:text-rose-400">
            <span class="font-sans">(-) Total de Saídas</span>
            <span>-{{ formatCurrency(cashFlow().totalOutflows) }}</span>
          </div>
          <div class="pl-3 space-y-0.5 text-[11px] text-muted-foreground font-sans">
            <div class="flex justify-between">
              <span>• Pagamento de Compras / Fornecedores:</span>
              <span>{{ formatCurrency(cashFlow().purchasePayments) }}</span>
            </div>
            <div class="flex justify-between">
              <span>• Despesas Operacionais Pagas:</span>
              <span>{{ formatCurrency(cashFlow().businessExpensesPaid) }}</span>
            </div>
            <div class="flex justify-between">
              <span>• Despesas Pessoais Pagas:</span>
              <span>{{ formatCurrency(cashFlow().personalExpensesPaid) }}</span>
            </div>
            <div class="flex justify-between">
              <span>• Pagamento Empréstimos (Amortização + Juros):</span>
              <span>{{ formatCurrency(cashFlow().loanPaymentsTotal) }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center py-1.5 font-bold border-t border-border bg-muted/40 px-2 rounded text-sm mt-3">
          <span class="font-sans text-foreground">(=) Saldo Líquido do Caixa</span>
          <span class="text-foreground">{{ formatCurrency(cashFlow().netCashFlow) }}</span>
        </div>
      </div>
    </div>
  `,
})
export class CashSummaryComponent {
  readonly cashFlow = input.required<DashboardCashFlowMetrics>();

  protected readonly formatCurrency = formatCurrency;
}
