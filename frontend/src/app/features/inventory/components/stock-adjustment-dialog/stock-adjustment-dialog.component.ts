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
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowRight,
  lucideCheck,
  lucideSlidersHorizontal,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import {
  AllowedAdjustmentType,
  CreateStockAdjustmentDto,
  InventoryProduct,
} from '../../inventory.models';
import {
  ALLOWED_ADJUSTMENT_OPTIONS,
  formatAverageCost,
  formatQuantity,
  getUnitOfMeasureLabel,
  isValidStockQuantity,
} from '../../inventory.utils';

@Component({
  selector: 'app-stock-adjustment-dialog',
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
      lucideSlidersHorizontal,
      lucideX,
      lucideCheck,
      lucideAlertCircle,
      lucideArrowRight,
    }),
  ],
  template: `
    <div class="space-y-5" data-testid="stock-adjustment-container">
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-border pb-3">
        <div>
          <div class="flex items-center gap-2">
            <ng-icon name="lucideSlidersHorizontal" class="size-5 text-primary" />
            <h2 class="text-lg font-semibold text-foreground">
              Ajuste Manual de Estoque
            </h2>
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">
            Registre acertos de inventário, sobras, faltas, perdas ou consumo interno.
          </p>
        </div>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="size-8 text-muted-foreground hover:text-foreground"
          (click)="cancel.emit()"
          aria-label="Fechar"
          data-testid="btn-close-adjustment"
        >
          <ng-icon name="lucideX" class="size-4" />
        </button>
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
            <span class="text-xs text-muted-foreground block">Estoque Atual</span>
            <span class="text-base font-mono font-bold text-foreground">
              {{ formatQty(prod.currentStock, unitLabel(prod.unitOfMeasure)) }}
            </span>
          </div>
        </div>
      }

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- 1. Tipo de Ajuste -->
        <div class="space-y-1.5">
          <label hlmLabel for="adj-type" class="text-sm font-medium text-foreground">
            Tipo de Operação *
          </label>
          <select
            id="adj-type"
            hlmInput
            formControlName="type"
            class="w-full text-sm bg-background border-input"
            data-testid="adjustment-type-select"
          >
            @for (opt of adjustmentOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
          <p class="text-xs text-muted-foreground">
            {{ selectedTypeDescription() }}
          </p>
        </div>

        <!-- 2. Quantidade -->
        <div class="space-y-1.5">
          <label hlmLabel for="adj-quantity" class="text-sm font-medium text-foreground">
            Quantidade a movimentar ({{ unitLabel(product()?.unitOfMeasure) }}) *
          </label>
          <input
            id="adj-quantity"
            hlmInput
            type="number"
            step="0.001"
            min="0.001"
            formControlName="quantity"
            placeholder="Ex: 5"
            class="w-full font-mono text-sm"
            data-testid="adjustment-quantity-input"
          />
          @if (form.controls.quantity.touched && form.controls.quantity.errors) {
            <p class="text-xs text-destructive flex items-center gap-1">
              <ng-icon name="lucideAlertCircle" class="size-3" />
              A quantidade deve ser um número positivo com até 3 casas decimais.
            </p>
          }

          <!-- Insufficient stock error for negative adjustments -->
          @if (isQuantityExceedingStock()) {
            <p class="text-xs text-destructive font-medium flex items-center gap-1" data-testid="insufficient-stock-error">
              <ng-icon name="lucideAlertCircle" class="size-3" />
              Quantidade solicitada excede o saldo em estoque atual ({{ formatQty(product()?.currentStock) }}).
            </p>
          }
        </div>

        <!-- Projected Stock Preview -->
        @if (projectedStock(); as proj) {
          <div class="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs flex items-center justify-between">
            <span class="text-muted-foreground">Saldo projetado após o ajuste:</span>
            <span class="font-mono font-bold text-foreground">
              {{ formatQty(proj.value, unitLabel(product()?.unitOfMeasure)) }}
            </span>
          </div>
        }

        <!-- 3. Motivo (Obrigatório, min 3 chars) -->
        <div class="space-y-1.5">
          <label hlmLabel for="adj-reason" class="text-sm font-medium text-foreground">
            Motivo do Ajuste *
          </label>
          <input
            id="adj-reason"
            hlmInput
            type="text"
            formControlName="reason"
            placeholder="Ex: Diferença constatada no inventário semanal"
            class="w-full text-sm"
            data-testid="adjustment-reason-input"
          />
          @if (form.controls.reason.touched && form.controls.reason.errors) {
            <p class="text-xs text-destructive flex items-center gap-1">
              <ng-icon name="lucideAlertCircle" class="size-3" />
              O motivo é obrigatório e deve ter no mínimo 3 caracteres.
            </p>
          }
        </div>

        <!-- 4. Observações Adicionais (Opcional) -->
        <div class="space-y-1.5">
          <label hlmLabel for="adj-notes" class="text-sm font-medium text-foreground">
            Observações complementares (opcional)
          </label>
          <input
            id="adj-notes"
            hlmInput
            type="text"
            formControlName="notes"
            placeholder="Ex: Conferido pelo auditor João"
            class="w-full text-sm"
            data-testid="adjustment-notes-input"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            hlmBtn
            variant="outline"
            (click)="cancel.emit()"
            [disabled]="saving()"
            data-testid="btn-cancel-adjustment"
          >
            Cancelar
          </button>
          <button
            type="submit"
            hlmBtn
            variant="default"
            [disabled]="isSubmitDisabled()"
            data-testid="btn-submit-adjustment"
          >
            @if (saving()) {
              <span>Salvando...</span>
            } @else {
              <ng-icon name="lucideCheck" class="size-4 mr-1.5" />
              <span>Confirmar Ajuste</span>
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class StockAdjustmentDialogComponent implements OnInit {
  readonly product = input.required<InventoryProduct>();
  readonly saving = input<boolean>(false);

  readonly submitAdjustment = output<CreateStockAdjustmentDto>();
  readonly cancel = output<void>();

  readonly adjustmentOptions = ALLOWED_ADJUSTMENT_OPTIONS;

  readonly form = new FormGroup({
    type: new FormControl<AllowedAdjustmentType>('ADJUSTMENT_POSITIVE', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    quantity: new FormControl<number | null>(null, [
      Validators.required,
      (control) => (isValidStockQuantity(control.value) ? null : { invalidQuantity: true }),
    ]),
    reason: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    notes: new FormControl<string>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    // default setup
  }

  selectedTypeDescription(): string {
    const current = this.form.controls.type.value;
    return this.adjustmentOptions.find((o) => o.value === current)?.description ?? '';
  }

  isQuantityExceedingStock(): boolean {
    const prod = this.product();
    if (!prod) return false;

    const currentType = this.form.controls.type.value;
    const isNegative = currentType !== 'ADJUSTMENT_POSITIVE';
    if (!isNegative) return false;

    const qty = this.form.controls.quantity.value;
    if (typeof qty !== 'number' || isNaN(qty) || qty <= 0) return false;

    // Compare with currentStock (convert safely to Number only for client validation boundary)
    const currentStockNum = parseFloat(prod.currentStock || '0');
    return qty > currentStockNum;
  }

  projectedStock = computed(() => {
    const prod = this.product();
    if (!prod) return null;

    const qty = this.form.controls.quantity.value;
    if (typeof qty !== 'number' || isNaN(qty) || qty <= 0) return null;

    const type = this.form.controls.type.value;
    const currentStockNum = parseFloat(prod.currentStock || '0');
    const newStock =
      type === 'ADJUSTMENT_POSITIVE' ? currentStockNum + qty : currentStockNum - qty;

    if (newStock < 0) return null;

    return { value: newStock.toFixed(3) };
  });

  isSubmitDisabled(): boolean {
    return (
      this.form.invalid ||
      this.isQuantityExceedingStock() ||
      this.saving() ||
      !this.product()?.isActive
    );
  }

  onSubmit(): void {
    if (this.isSubmitDisabled()) return;

    const values = this.form.getRawValue();
    const qty = Number(values.quantity);

    const dto: CreateStockAdjustmentDto = {
      productId: this.product().id,
      type: values.type,
      quantity: qty,
      reason: values.reason.trim(),
      notes: values.notes?.trim() || undefined,
    };

    this.submitAdjustment.emit(dto);
  }

  formatQty(qty?: string | null, unit?: string): string {
    return formatQuantity(qty, unit);
  }

  unitLabel(unit: any): string {
    return getUnitOfMeasureLabel(unit);
  }
}
