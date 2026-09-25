import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideCheck,
  lucideInfo,
  lucidePackagePlus,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import {
  InventoryProduct,
  OpeningBalanceDto,
} from '../../inventory.models';
import {
  getUnitOfMeasureLabel,
  isValidStockQuantity,
  isValidUnitCost,
} from '../../inventory.utils';

@Component({
  selector: 'app-opening-balance-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HlmButton,
    HlmInput,
    HlmLabel,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucidePackagePlus,
      lucideX,
      lucideCheck,
      lucideInfo,
      lucideAlertCircle,
    }),
  ],
  template: `
    <div class="space-y-5" data-testid="opening-balance-container">
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-border pb-3">
        <div>
          <div class="flex items-center gap-2">
            <ng-icon name="lucidePackagePlus" class="size-5 text-primary" />
            <h2 class="text-lg font-semibold text-foreground">
              Registrar Saldo Inicial
            </h2>
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">
            Implantação de estoque para produtos recém-cadastrados sem movimentações.
          </p>
        </div>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="size-8 text-muted-foreground hover:text-foreground"
          (click)="cancel.emit()"
          aria-label="Fechar"
          data-testid="btn-close-opening"
        >
          <ng-icon name="lucideX" class="size-4" />
        </button>
      </div>

      <!-- Explanatory Alert -->
      <div class="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
        <ng-icon name="lucideInfo" class="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <span class="font-semibold block">Regra contábil de implantação</span>
          O saldo inicial define a quantidade e o custo unitário inicial do produto. Ele só pode ser registrado
          uma única vez antes de qualquer compra, venda ou ajuste.
        </div>
      </div>

      <!-- Product Info Card -->
      @if (product(); as prod) {
        <div class="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-sm">
          <div>
            <span class="font-semibold text-foreground block">{{ prod.name }}</span>
            <span class="text-xs text-muted-foreground">
              {{ prod.category?.name || 'Sem categoria' }} • {{ unitLabel(prod.unitOfMeasure) }}
            </span>
          </div>
          <div class="text-right">
            <span class="text-xs text-muted-foreground block">Situação Atual</span>
            <span class="text-xs font-medium text-foreground">
              Saldo Zero / Sem histórico
            </span>
          </div>
        </div>
      }

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- 1. Quantidade Inicial -->
        <div class="space-y-1.5">
          <label hlmLabel for="opening-quantity" class="text-sm font-medium text-foreground">
            Quantidade Inicial ({{ unitLabel(product()?.unitOfMeasure) }}) *
          </label>
          <input
            id="opening-quantity"
            hlmInput
            type="number"
            step="0.001"
            min="0.001"
            formControlName="quantity"
            placeholder="Ex: 100"
            class="w-full font-mono text-sm"
            data-testid="opening-quantity-input"
          />
          @if (form.controls.quantity.touched && form.controls.quantity.errors) {
            <p class="text-xs text-destructive flex items-center gap-1">
              <ng-icon name="lucideAlertCircle" class="size-3" />
              A quantidade deve ser maior que zero com até 3 casas decimais.
            </p>
          }
        </div>

        <!-- 2. Custo Unitário Inicial -->
        <div class="space-y-1.5">
          <label hlmLabel for="opening-unit-cost" class="text-sm font-medium text-foreground">
            Custo Unitário de Aquisição (R$) *
          </label>
          <input
            id="opening-unit-cost"
            hlmInput
            type="number"
            step="0.0001"
            min="0"
            formControlName="unitCost"
            placeholder="Ex: 4.5000"
            class="w-full font-mono text-sm"
            data-testid="opening-cost-input"
          />
          @if (form.controls.unitCost.touched && form.controls.unitCost.errors) {
            <p class="text-xs text-destructive flex items-center gap-1">
              <ng-icon name="lucideAlertCircle" class="size-3" />
              O custo unitário não pode ser negativo e deve ter até 4 casas decimais.
            </p>
          }
          <p class="text-xs text-muted-foreground">
            Será a base para o custo médio ponderado (CMP) inicial do produto.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            hlmBtn
            variant="outline"
            (click)="cancel.emit()"
            [disabled]="saving()"
            data-testid="btn-cancel-opening"
          >
            Cancelar
          </button>
          <button
            type="submit"
            hlmBtn
            variant="default"
            [disabled]="form.invalid || saving()"
            data-testid="btn-submit-opening"
          >
            @if (saving()) {
              <span>Gravando...</span>
            } @else {
              <ng-icon name="lucideCheck" class="size-4 mr-1.5" />
              <span>Confirmar Saldo Inicial</span>
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class OpeningBalanceDialogComponent implements OnInit {
  readonly product = input.required<InventoryProduct>();
  readonly saving = input<boolean>(false);

  readonly submitOpeningBalance = output<OpeningBalanceDto>();
  readonly cancel = output<void>();

  readonly form = new FormGroup({
    quantity: new FormControl<number | null>(null, [
      Validators.required,
      (control) => (isValidStockQuantity(control.value) ? null : { invalidQuantity: true }),
    ]),
    unitCost: new FormControl<number | null>(null, [
      Validators.required,
      (control) => (isValidUnitCost(control.value) ? null : { invalidCost: true }),
    ]),
  });

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    const values = this.form.getRawValue();
    const qty = Number(values.quantity);
    const cost = Number(values.unitCost);

    const dto: OpeningBalanceDto = {
      productId: this.product().id,
      quantity: qty,
      unitCost: cost,
    };

    this.submitOpeningBalance.emit(dto);
  }

  unitLabel(unit: any): string {
    return getUnitOfMeasureLabel(unit);
  }
}
