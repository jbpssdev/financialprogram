import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideCheck,
  lucideHistory,
  lucideTrendingUp,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { Product } from '../../products.models';
import { formatAverageCost, formatCurrency, formatDateTime, isValidPrice, getUnitOfMeasureLabel } from '../../products.utils';

@Component({
  selector: 'app-price-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    HlmButton,
    HlmInput,
    HlmLabel,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideTrendingUp,
      lucideHistory,
      lucideArrowRight,
      lucideCheck,
    }),
  ],
  template: `
    <div class="space-y-6">
      <!-- Header Product Card -->
      <div class="p-4 rounded-lg border border-border bg-card space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-sm text-foreground" data-testid="price-dialog-product-name">
              {{ product().name }}
            </h3>
            <p class="text-xs text-muted-foreground">
              {{ product().category?.name || 'Sem categoria' }} • {{ unitLabel(product().unitOfMeasure) }}
            </p>
          </div>
          <div class="text-right">
            <span class="text-xs text-muted-foreground block">Preço Atual</span>
            <span class="text-base font-bold text-foreground font-mono" data-testid="price-dialog-current-price">
              {{ formatMoney(product().currentPrice) }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
          <div>
            <span>Custo Médio Atual: </span>
            <strong class="text-foreground font-mono">
              {{ formatCost(product().averageCost) }}
            </strong>
          </div>
          <div class="text-right">
            <span>Margem atual estimada: </span>
            <strong
              class="font-mono"
              [ngClass]="{
                'text-emerald-600 dark:text-emerald-400': currentMargin() > 0,
                'text-rose-600 dark:text-rose-400': currentMargin() < 0
              }"
            >
              {{ currentMargin().toFixed(1) }}%
            </strong>
          </div>
        </div>
      </div>

      <!-- New Price Form -->
      <div class="space-y-3">
        <label hlmLabel for="new-price-input" class="text-xs font-semibold">
          Novo Preço de Venda (R$) <span class="text-destructive">*</span>
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-xs text-muted-foreground font-mono">
            R$
          </span>
          <input
            hlmInput
            id="new-price-input"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            [ngModel]="newPriceValue()"
            (ngModelChange)="onPriceChange($event)"
            class="pl-9 font-mono text-sm w-full"
            data-testid="input-new-price"
          />
        </div>

        @if (newPriceValue() !== null && newPriceValue() !== undefined) {
          <div class="text-xs text-muted-foreground flex items-center justify-between">
            <span>Nova margem estimada:</span>
            <span
              class="font-mono font-medium"
              [ngClass]="{
                'text-emerald-600 dark:text-emerald-400': newMargin() > 0,
                'text-rose-600 dark:text-rose-400': newMargin() < 0
              }"
            >
              {{ newMargin().toFixed(1) }}%
            </span>
          </div>
        }

        @if (error()) {
          <p class="text-xs text-destructive font-medium" data-testid="price-dialog-error">
            {{ error() }}
          </p>
        }

        <p class="text-[11px] text-muted-foreground leading-normal">
          Margens estimadas com base no custo médio atual, apenas para consulta. Não representam o lucro ou a margem de vendas. Uma mudança efetiva de preço gera histórico automaticamente.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          hlmBtn
          variant="outline"
          size="sm"
          type="button"
          (click)="cancel.emit()"
          data-testid="btn-cancel-price-change"
        >
          Cancelar
        </button>

        <button
          hlmBtn
          size="sm"
          type="button"
          (click)="onSubmit()"
          [disabled]="saving()"
          class="gap-1.5"
          data-testid="btn-confirm-price-change"
        >
          <ng-icon name="lucideCheck" class="size-4" />
          <span>Confirmar Alteração</span>
        </button>
      </div>

      <!-- Price History Section -->
      @if (product().priceHistory && product().priceHistory!.length > 0) {
        <div class="space-y-3 pt-4 border-t border-border">
          <div class="flex items-center gap-2">
            <ng-icon name="lucideHistory" class="size-4 text-muted-foreground" />
            <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Histórico Recente de Preços
            </h4>
          </div>

          <div class="border border-border rounded-lg overflow-hidden text-xs">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-muted/40 border-b border-border text-muted-foreground font-medium">
                  <th scope="col" class="py-2 px-3">Data / Hora</th>
                  <th scope="col" class="py-2 px-3 text-right">Preço Anterior</th>
                  <th scope="col" class="py-2 px-3 text-center"></th>
                  <th scope="col" class="py-2 px-3 text-right">Novo Preço</th>
                  <th scope="col" class="py-2 px-3 text-right">Custo Médio</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60 font-mono">
                @for (history of product().priceHistory; track history.id) {
                  <tr class="hover:bg-muted/20">
                    <td class="py-2 px-3 text-muted-foreground font-sans">
                      {{ formatDate(history.changedAt) }}
                    </td>
                    <td class="py-2 px-3 text-right text-muted-foreground">
                      {{ formatMoney(history.oldPrice) }}
                    </td>
                    <td class="py-2 px-1 text-center text-muted-foreground">
                      <ng-icon name="lucideArrowRight" class="size-3" />
                    </td>
                    <td class="py-2 px-3 text-right font-medium text-foreground">
                      {{ formatMoney(history.newPrice) }}
                    </td>
                    <td class="py-2 px-3 text-right text-muted-foreground">
                      {{ formatCost(history.averageCost) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class PriceDialogComponent implements OnInit {
  readonly product = input.required<Product>();
  readonly saving = input<boolean>(false);

  readonly savePrice = output<{ id: string; newPrice: number }>();
  readonly cancel = output<void>();
  readonly formatCost = formatAverageCost;
  readonly unitLabel = getUnitOfMeasureLabel;

  readonly newPriceValue = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const current = Number(this.product().currentPrice);
    if (Number.isFinite(current)) {
      this.newPriceValue.set(current);
    }
  }

  readonly currentMargin = computed(() => {
    const price = Number(this.product().currentPrice);
    const cost = Number(this.product().averageCost);
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  });

  readonly newMargin = computed(() => {
    const price = this.newPriceValue();
    const cost = Number(this.product().averageCost);
    if (!price || price <= 0) return 0;
    return ((price - cost) / price) * 100;
  });

  formatMoney(val: string | number): string {
    return formatCurrency(val);
  }

  formatDate(iso: string): string {
    return formatDateTime(iso);
  }

  onPriceChange(val: number | string | null): void {
    const num = val === '' || val === null ? null : Number(val);
    this.newPriceValue.set(num);
    if (this.error()) {
      this.error.set(null);
    }
  }

  onSubmit(): void {
    const val = this.newPriceValue();
    if (val === null || val === undefined || !Number.isFinite(val)) {
      this.error.set('Informe um preço de venda válido.');
      return;
    }

    if (val < 0) {
      this.error.set('O preço de venda não pode ser negativo.');
      return;
    }

    if (!isValidPrice(val)) {
      this.error.set('Informe até 2 casas decimais e no máximo 9.999.999.999,99.');
      return;
    }

    const current = Number(this.product().currentPrice);
    if (val === current) {
      this.error.set('O novo preço deve ser diferente do preço atual.');
      return;
    }

    this.savePrice.emit({
      id: this.product().id,
      newPrice: val,
    });
  }
}
