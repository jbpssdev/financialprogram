import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { NgIcon, provideIcons } from '@ng-icons/core';

registerLocaleData(localePt);
import {
  lucideAlertCircle,
  lucideArrowRight,
  lucideCheck,
  lucideChevronDown,
  lucideDollarSign,
  lucideDownload,
  lucideEye,
  lucideFileText,
  lucideFilter,
  lucideInfo,
  lucideMoon,
  lucidePlus,
  lucideSun,
  lucideTrash2,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideWallet,
} from '@ng-icons/lucide';

import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { HlmToaster, toast } from '@spartan-ng/helm/sonner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface MockTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'receita' | 'despesa' | 'financiamento';
  amount: number;
  status: 'liquidado' | 'pendente' | 'conciliado';
}

@Component({
  selector: 'app-ui-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    NgIcon,
    HlmButton,
    HlmBadge,
    HlmCardImports,
    HlmDialogImports,
    HlmDropdownMenuImports,
    HlmInput,
    HlmLabel,
    HlmSeparator,
    HlmSheetImports,
    HlmSkeleton,
    HlmTableImports,
    HlmTooltip,
    HlmToaster,
    PageHeaderComponent,
  ],
  providers: [
    provideIcons({
      lucideAlertCircle,
      lucideArrowRight,
      lucideCheck,
      lucideChevronDown,
      lucideDollarSign,
      lucideDownload,
      lucideEye,
      lucideFileText,
      lucideFilter,
      lucideInfo,
      lucideMoon,
      lucidePlus,
      lucideSun,
      lucideTrash2,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideWallet,
    }),
  ],
  template: `
    <div class="min-h-screen bg-background text-foreground transition-colors duration-200">
      <!-- 1. Development Showcase Banner -->
      <aside
        role="region"
        aria-label="Aviso de Desenvolvimento"
        class="border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-xs sm:text-sm font-medium text-warning flex items-center justify-between gap-3 shadow-xs"
      >
        <div class="flex items-center gap-2">
          <ng-icon name="lucideAlertCircle" class="size-4 shrink-0" />
          <span>
            <strong>Ambiente de Desenvolvimento:</strong> Esta página é um showcase técnico exclusivo para
            validação visual, acessibilidade e integridade dos componentes Spartan/UI e tokens do design system.
          </span>
        </div>
        <button
          hlmBtn
          variant="outline"
          size="xs"
          (click)="toggleDarkMode()"
          class="shrink-0 gap-1.5 border-warning/40 text-foreground hover:bg-warning/20"
        >
          @if (isDark()) {
            <ng-icon name="lucideSun" class="size-3.5" />
            <span>Modo Claro</span>
          } @else {
            <ng-icon name="lucideMoon" class="size-3.5" />
            <span>Modo Escuro</span>
          }
        </button>
      </aside>

      <main class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <!-- 2. PageHeader Shared Component -->
        <app-page-header
          title="Showcase de Componentes UI"
          description="Catálogo de primitivas acessíveis (Spartan Brain + Helm), design tokens sóbrios e tipografia financeira."
        >
          <div class="flex items-center gap-2">
            <!-- Sheet Component Trigger -->
            <hlm-sheet side="right">
              <button id="sheet-trigger-btn" hlmBtn variant="outline" size="sm" hlmSheetTrigger>
                <ng-icon name="lucideFilter" class="mr-1.5 size-4" />
                Filtros (Sheet)
              </button>
              <hlm-sheet-content *hlmSheetPortal="let ctx">
                <hlm-sheet-header>
                  <h3 hlmSheetTitle>Painel Lateral de Filtros</h3>
                  <p hlmSheetDescription>Demonstração da primitiva Sheet (gaveta lateral direita acessível).</p>
                </hlm-sheet-header>
                <div class="space-y-4 py-6">
                  <div class="space-y-1.5">
                    <label hlmLabel for="filter-period">Competência</label>
                    <input hlmInput id="filter-period" placeholder="2026-09" />
                  </div>
                  <div class="space-y-1.5">
                    <label hlmLabel for="filter-center">Centro de Custo</label>
                    <input hlmInput id="filter-center" placeholder="Operações Comerciais" />
                  </div>
                </div>
                <hlm-sheet-footer>
                  <button hlmBtn variant="outline" hlmSheetClose>Fechar</button>
                  <button hlmBtn (click)="notifyInfo('Filtros aplicados')" hlmSheetClose>Aplicar</button>
                </hlm-sheet-footer>
              </hlm-sheet-content>
            </hlm-sheet>

            <!-- Dropdown Menu Component Trigger -->
            <button
              id="dropdown-actions-btn"
              [hlmDropdownMenuTrigger]="actionsMenu"
              hlmBtn
              variant="outline"
              size="sm"
            >
              Exportar
              <ng-icon name="lucideChevronDown" class="ml-1.5 size-3.5" />
            </button>
            <ng-template #actionsMenu>
              <hlm-dropdown-menu class="w-48">
                <hlm-dropdown-menu-label>Formatos Disponíveis</hlm-dropdown-menu-label>
                <hlm-dropdown-menu-separator />
                <hlm-dropdown-menu-group>
                  <button hlmDropdownMenuItem (click)="notifySuccess('Relatório exportado para PDF')">
                    <ng-icon name="lucideFileText" class="mr-2 size-4" />
                    Relatório em PDF
                  </button>
                  <button hlmDropdownMenuItem (click)="notifySuccess('Planilha exportada para Excel')">
                    <ng-icon name="lucideDownload" class="mr-2 size-4" />
                    Planilha Excel (XLSX)
                  </button>
                </hlm-dropdown-menu-group>
              </hlm-dropdown-menu>
            </ng-template>

            <!-- Dialog Component Trigger -->
            <hlm-dialog>
              <button id="dialog-trigger-btn" hlmBtn size="sm" hlmDialogTrigger>
                <ng-icon name="lucidePlus" class="mr-1.5 size-4" />
                Novo Lançamento
              </button>
              <hlm-dialog-content *hlmDialogPortal="let ctx">
                <hlm-dialog-header>
                  <h3 hlmDialogTitle>Confirmar Criação de Registro</h3>
                  <p hlmDialogDescription>
                    Esta é uma janela modal (Dialog) com foco preso, backdrop escurecido e fechamento via ESC.
                  </p>
                </hlm-dialog-header>
                <div class="py-2 text-sm text-muted-foreground">
                  Confirma a gravação do lote contábil de competência 09/2026?
                </div>
                <hlm-dialog-footer>
                  <button hlmBtn variant="outline" hlmDialogClose>Cancelar</button>
                  <button hlmBtn (click)="notifySuccess('Lançamento registrado com sucesso!')" hlmDialogClose>
                    Confirmar Registro
                  </button>
                </hlm-dialog-footer>
              </hlm-dialog-content>
            </hlm-dialog>
          </div>
        </app-page-header>

        <!-- 3. Financial KPI Cards Grid -->
        <section aria-labelledby="kpi-section-title" class="space-y-4">
          <h2 id="kpi-section-title" class="text-lg font-semibold tracking-tight">Indicadores Chave (Cards & Typography)</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div hlmCard>
              <div hlmCardHeader class="flex flex-row items-center justify-between pb-2">
                <p hlmCardTitle class="text-sm font-medium text-muted-foreground">Faturamento Bruto</p>
                <ng-icon name="lucideTrendingUp" class="size-4 text-success" />
              </div>
              <div hlmCardContent>
                <div class="text-2xl font-bold font-mono tracking-tight">R$ 142.850,00</div>
                <p class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span class="text-success font-medium">+12.4%</span> em relação ao mês anterior
                </p>
              </div>
            </div>

            <div hlmCard>
              <div hlmCardHeader class="flex flex-row items-center justify-between pb-2">
                <p hlmCardTitle class="text-sm font-medium text-muted-foreground">CMV & Despesas</p>
                <ng-icon name="lucideTrendingDown" class="size-4 text-destructive" />
              </div>
              <div hlmCardContent>
                <div class="text-2xl font-bold font-mono tracking-tight">R$ 88.420,00</div>
                <p class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span class="text-muted-foreground font-medium">61.9%</span> da receita bruta
                </p>
              </div>
            </div>

            <div hlmCard>
              <div hlmCardHeader class="flex flex-row items-center justify-between pb-2">
                <p hlmCardTitle class="text-sm font-medium text-muted-foreground">Resultado Operacional</p>
                <ng-icon name="lucideWallet" class="size-4 text-primary" />
              </div>
              <div hlmCardContent>
                <div class="text-2xl font-bold font-mono tracking-tight text-primary">R$ 54.430,00</div>
                <p class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  Margem operacional de <span class="font-medium">38.1%</span>
                </p>
              </div>
            </div>

            <div hlmCard>
              <div hlmCardHeader class="flex flex-row items-center justify-between pb-2">
                <p hlmCardTitle class="text-sm font-medium text-muted-foreground">Saldo Disponível</p>
                <ng-icon name="lucideDollarSign" class="size-4 text-accent" />
              </div>
              <div hlmCardContent>
                <div class="text-2xl font-bold font-mono tracking-tight">R$ 38.190,50</div>
                <p class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  Fluxo de caixa reconciliado
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. Interactive Feedback: Sonner Toaster -->
        <section aria-labelledby="toasts-title" class="space-y-4">
          <h2 id="toasts-title" class="text-lg font-semibold tracking-tight">Notificações Sonner (Toast System)</h2>
          <div hlmCard>
            <div hlmCardHeader>
              <h3 hlmCardTitle>Disparadores de Feedback Operacional</h3>
              <p hlmCardDescription>
                Notificações assíncronas estilizadas com paleta sóbria e posicionamento fixo não invasivo.
              </p>
            </div>
            <div hlmCardContent class="flex flex-wrap gap-3">
              <button hlmBtn variant="default" (click)="notifySuccess('Competência 09/2026 fechada com sucesso!')">
                <ng-icon name="lucideCheck" class="mr-1.5 size-4" />
                Toast Sucesso
              </button>
              <button hlmBtn variant="secondary" (click)="notifyInfo('Sincronização bancária em andamento...')">
                <ng-icon name="lucideInfo" class="mr-1.5 size-4" />
                Toast Informação
              </button>
              <button hlmBtn variant="outline" (click)="notifyWarning('Existem 3 conciliações pendentes de validação.')">
                <ng-icon name="lucideAlertCircle" class="mr-1.5 size-4 text-warning" />
                Toast Aviso
              </button>
              <button hlmBtn variant="destructive" (click)="notifyError('Erro ao estornar: período contábil bloqueado.')">
                <ng-icon name="lucideTrash2" class="mr-1.5 size-4" />
                Toast Erro
              </button>
            </div>
          </div>
        </section>

        <!-- 5. Button Variants & Sizes -->
        <section aria-labelledby="buttons-title" class="space-y-4">
          <h2 id="buttons-title" class="text-lg font-semibold tracking-tight">Botões (Variantes & Tamanhos)</h2>
          <div hlmCard>
            <div hlmCardHeader>
              <h3 hlmCardTitle>Hierarquia de Botões</h3>
              <p hlmCardDescription>
                Ações primárias, secundárias, neutras, destrutivas e utilitárias com suporte a ícones Lucide.
              </p>
            </div>
            <div hlmCardContent class="space-y-4">
              <div>
                <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Variantes</span>
                <div class="flex flex-wrap items-center gap-3">
                  <button hlmBtn variant="default">Primary / Default</button>
                  <button hlmBtn variant="secondary">Secondary</button>
                  <button hlmBtn variant="outline">Outline</button>
                  <button hlmBtn variant="ghost">Ghost</button>
                  <button hlmBtn variant="destructive">Destructive</button>
                  <a hlmBtn variant="link" href="#buttons-title">Link Button</a>
                </div>
              </div>

              <hr hlmSeparator />

              <div>
                <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Tamanhos & Ícones</span>
                <div class="flex flex-wrap items-center gap-3">
                  <button hlmBtn size="xs">Extra Small (xs)</button>
                  <button hlmBtn size="sm">Small (sm)</button>
                  <button hlmBtn size="default">Default</button>
                  <button hlmBtn size="lg">Large (lg)</button>
                  <button
                    hlmBtn
                    size="icon"
                    variant="outline"
                    [hlmTooltip]="'Visualizar detalhes contábeis'"
                    aria-label="Visualizar detalhes"
                  >
                    <ng-icon name="lucideEye" class="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 6. Badges & Status Tokens -->
        <section aria-labelledby="badges-title" class="space-y-4">
          <h2 id="badges-title" class="text-lg font-semibold tracking-tight">Badges & Rótulos de Estado</h2>
          <div hlmCard>
            <div hlmCardHeader>
              <h3 hlmCardTitle>Status Financeiros e Operacionais</h3>
              <p hlmCardDescription>Sinalização semântica discreta sem poluição cromática.</p>
            </div>
            <div hlmCardContent class="flex flex-wrap items-center gap-3">
              <span hlmBadge variant="default">Ativo / Padrão</span>
              <span hlmBadge variant="secondary">Rascunho</span>
              <span hlmBadge variant="outline">Auditoria Pendente</span>
              <span hlmBadge variant="destructive">Estornado / Cancelado</span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/30">
                <span class="size-1.5 rounded-full bg-success"></span>
                Conciliado
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30">
                <span class="size-1.5 rounded-full bg-warning"></span>
                Período Fechado
              </span>
            </div>
          </div>
        </section>

        <!-- 7. Form Controls: Inputs & Labels -->
        <section aria-labelledby="forms-title" class="space-y-4">
          <h2 id="forms-title" class="text-lg font-semibold tracking-tight">Controles de Formulário (Inputs & Labels)</h2>
          <div hlmCard>
            <div hlmCardHeader>
              <h3 hlmCardTitle>Entrada de Dados</h3>
              <p hlmCardDescription>Campos de texto com estados de foco, placeholder e descrições acessíveis.</p>
            </div>
            <div hlmCardContent>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div class="space-y-1.5">
                  <label hlmLabel for="input-email">E-mail Corporativo</label>
                  <input hlmInput id="input-email" type="email" placeholder="admin@empresa.com" />
                </div>
                <div class="space-y-1.5">
                  <label hlmLabel for="input-amount">Valor (R$)</label>
                  <input hlmInput id="input-amount" type="text" placeholder="0,00" class="font-mono" />
                </div>
                <div class="space-y-1.5">
                  <label hlmLabel for="input-disabled">Campo Bloqueado</label>
                  <input hlmInput id="input-disabled" type="text" value="Exercício 2025 (Bloqueado)" disabled />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 8. Tooltips & Micro-Interactions -->
        <section aria-labelledby="tooltips-title" class="space-y-4">
          <h2 id="tooltips-title" class="text-lg font-semibold tracking-tight">Tooltips (Dicas de Contexto Acessíveis)</h2>
          <div hlmCard>
            <div hlmCardHeader>
              <h3 hlmCardTitle>Orientações Flutuantes</h3>
              <p hlmCardDescription>Tooltips com posicionamento automático e transições suaves.</p>
            </div>
            <div hlmCardContent class="flex flex-wrap items-center gap-4">
              <button
                hlmBtn
                variant="outline"
                [hlmTooltip]="'A reconciliação valida lançamentos contra o extrato OFX.'"
              >
                Passe o mouse: Regra de Reconciliação
              </button>
              <button
                hlmBtn
                variant="secondary"
                [hlmTooltip]="'O lock transacional impede lançamentos retroativos em competências fechadas.'"
              >
                Passe o mouse: Período Fechado
              </button>
            </div>
          </div>
        </section>

        <!-- 9. Skeletons (Loading States) -->
        <section aria-labelledby="skeletons-title" class="space-y-4">
          <h2 id="skeletons-title" class="text-lg font-semibold tracking-tight">Skeletons (Estados de Carregamento)</h2>
          <div hlmCard>
            <div hlmCardHeader>
              <h3 hlmCardTitle>Placeholders de Carga</h3>
              <p hlmCardDescription>Evitam layout shift (CLS) durante requisições assíncronas.</p>
            </div>
            <div hlmCardContent class="space-y-3">
              <div class="flex items-center gap-4">
                <div hlmSkeleton class="size-12 rounded-full"></div>
                <div class="space-y-2 flex-1">
                  <div hlmSkeleton class="h-4 w-1/3"></div>
                  <div hlmSkeleton class="h-3 w-1/2"></div>
                </div>
              </div>
              <div hlmSkeleton class="h-24 w-full rounded-md"></div>
            </div>
          </div>
        </section>

        <!-- 10. Financial Data Table -->
        <section aria-labelledby="table-title" class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 id="table-title" class="text-lg font-semibold tracking-tight">Tabela Financeira (Lançamentos Recentes)</h2>
              <p class="text-sm text-muted-foreground">Exemplo com tipografia tabular monoespaçada e alinhamentos adequados.</p>
            </div>
          </div>

          <div hlmCard class="p-0 overflow-hidden">
            <div hlmTableContainer>
              <table hlmTable class="w-full">
                <thead hlmTHead>
                  <tr hlmTr>
                    <th hlmTh class="w-[120px]">Data</th>
                    <th hlmTh>Descrição</th>
                    <th hlmTh class="w-[180px]">Categoria</th>
                    <th hlmTh class="w-[130px]">Tipo</th>
                    <th hlmTh class="w-[130px] text-center">Status</th>
                    <th hlmTh class="w-[160px] text-right font-mono">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody hlmTBody>
                  @for (tx of transactions(); track tx.id) {
                    <tr hlmTr class="hover:bg-muted/50 transition-colors">
                      <td hlmTd class="font-mono text-xs text-muted-foreground">{{ tx.date }}</td>
                      <td hlmTd class="font-medium text-foreground">{{ tx.description }}</td>
                      <td hlmTd class="text-muted-foreground text-xs">{{ tx.category }}</td>
                      <td hlmTd>
                        @switch (tx.type) {
                          @case ('receita') {
                            <span class="inline-flex items-center text-xs font-medium text-success gap-1">
                              <ng-icon name="lucideTrendingUp" class="size-3" /> Receita
                            </span>
                          }
                          @case ('despesa') {
                            <span class="inline-flex items-center text-xs font-medium text-destructive gap-1">
                              <ng-icon name="lucideTrendingDown" class="size-3" /> Despesa
                            </span>
                          }
                          @case ('financiamento') {
                            <span class="inline-flex items-center text-xs font-medium text-primary gap-1">
                              <ng-icon name="lucideWallet" class="size-3" /> Empréstimo
                            </span>
                          }
                        }
                      </td>
                      <td hlmTd class="text-center">
                        @switch (tx.status) {
                          @case ('conciliado') {
                            <span hlmBadge variant="default" class="text-[10px] uppercase">Conciliado</span>
                          }
                          @case ('liquidado') {
                            <span hlmBadge variant="secondary" class="text-[10px] uppercase">Liquidado</span>
                          }
                          @case ('pendente') {
                            <span hlmBadge variant="outline" class="text-[10px] uppercase">Pendente</span>
                          }
                        }
                      </td>
                      <td hlmTd class="text-right font-mono font-medium" [class.text-success]="tx.type === 'receita'" [class.text-destructive]="tx.type === 'despesa'">
                        {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div hlmCardFooter class="border-t border-border bg-muted/20 px-6 py-3 text-xs text-muted-foreground flex items-center justify-between">
              <span>Total de registros: {{ transactions().length }}</span>
              <span class="font-medium">Exibição de validação técnica do Design System</span>
            </div>
          </div>
        </section>
      </main>
      <hlm-toaster />
    </div>
  `,
})
export class UiPreviewComponent {
  protected readonly isDark = signal<boolean>(false);

  protected readonly transactions = signal<MockTransaction[]>([
    {
      id: 'tx-001',
      date: '2026-09-24',
      description: 'Venda de Balcão - NF 1042',
      category: 'Receita Operacional',
      type: 'receita',
      amount: 4850.0,
      status: 'conciliado',
    },
    {
      id: 'tx-002',
      date: '2026-09-23',
      description: 'Fornecedor Embalagens Kraft S/A',
      category: 'CMV / Insumos',
      type: 'despesa',
      amount: -1280.5,
      status: 'conciliado',
    },
    {
      id: 'tx-003',
      date: '2026-09-22',
      description: 'Conta de Energia Elétrica - Matriz',
      category: 'Despesa Administrativa',
      type: 'despesa',
      amount: -640.2,
      status: 'liquidado',
    },
    {
      id: 'tx-004',
      date: '2026-09-21',
      description: 'Amortização Empréstimo Capital de Giro',
      category: 'Passivo Financeiro',
      type: 'financiamento',
      amount: -2500.0,
      status: 'liquidado',
    },
    {
      id: 'tx-005',
      date: '2026-09-20',
      description: 'Contrato Recorrente Consultoria',
      category: 'Receita Operacional',
      type: 'receita',
      amount: 12500.0,
      status: 'pendente',
    },
  ]);

  protected toggleDarkMode(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  protected notifySuccess(msg: string): void {
    toast.success(msg);
  }

  protected notifyInfo(msg: string): void {
    toast.info(msg);
  }

  protected notifyWarning(msg: string): void {
    toast.warning(msg);
  }

  protected notifyError(msg: string): void {
    toast.error(msg);
  }
}
