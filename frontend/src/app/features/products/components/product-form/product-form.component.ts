import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideCheck,
  lucideFolderPlus,
  lucideInfo,
  lucidePackage,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import {
  Category,
  CreateProductDto,
  ItemType,
  Product,
  UnitOfMeasure,
  UpdateProductDto,
} from '../../products.models';
import {
  ITEM_TYPE_OPTIONS,
  UNIT_OF_MEASURE_OPTIONS,
  formatAverageCost,
  isValidPrice,
  formatQuantity,
} from '../../products.utils';

@Component({
  selector: 'app-product-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HlmButton,
    HlmInput,
    HlmLabel,
    HlmBadge,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucidePackage,
      lucideInfo,
      lucideAlertCircle,
      lucideCheck,
      lucideFolderPlus,
    }),
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5" data-testid="product-form">
      <!-- Title & Mode indicator -->
      <div class="flex items-center justify-between border-b border-border pb-3">
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ng-icon name="lucidePackage" class="size-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-foreground" data-testid="form-title">
              {{ isEditing() ? 'Editar Produto' : 'Novo Produto' }}
            </h3>
            <p class="text-xs text-muted-foreground">
              {{ isEditing() ? 'Atualize as informações do item' : 'Preencha os dados para cadastrar um novo item' }}
            </p>
          </div>
        </div>

        @if (isEditing()) {
          <span hlmBadge variant="outline" class="font-mono text-xs">
            ID: {{ product()!.id.slice(0, 8) }}...
          </span>
        }
      </div>

      <!-- Informative Stock & Cost Banner (Edit Mode) -->
      @if (isEditing()) {
        <div class="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border text-xs">
          <div>
            <span class="text-muted-foreground block text-[11px]">Estoque Atual (Somente Leitura)</span>
            <span class="font-mono font-semibold text-foreground text-sm" data-testid="form-stock-info">
              {{ selectedType() === 'SERVICE' ? 'Não se aplica' : formatStock(product()!.currentStock) }}
            </span>
          </div>
          <div class="text-right">
            <span class="text-muted-foreground block text-[11px]">Custo Médio Atual</span>
            <span class="font-mono font-semibold text-foreground text-sm" data-testid="form-cost-info">
              {{ formatCost(product()!.averageCost) }}
            </span>
          </div>
        </div>
      }

      <!-- Item Type Callout (SERVICE) -->
      @if (selectedType() === 'SERVICE') {
        <div class="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs" data-testid="service-callout">
          <ng-icon name="lucideInfo" class="size-4 shrink-0 mt-0.5" />
          <div class="space-y-0.5">
            <p class="font-medium">Item do tipo Serviço</p>
            <p class="text-[11px] leading-relaxed">
              Serviços não possuem controle de estoque físico neste cadastro. Preço e unidade podem ser editados; estoque e custo médio são somente leitura.
            </p>
          </div>
        </div>
      }

      <!-- Product Name -->
      <div class="space-y-1.5">
        <label hlmLabel for="prod-name" class="text-xs font-semibold">
          Nome do Produto <span class="text-destructive">*</span>
        </label>
        <input
          hlmInput
          id="prod-name"
          formControlName="name"
          placeholder="Ex: Teclado Mecânico Pro Wireless"
          class="w-full text-sm"
          data-testid="input-product-name"
        />
        @if (nameControl?.invalid && (nameControl?.dirty || nameControl?.touched)) {
          <p class="text-xs text-destructive font-medium" data-testid="error-product-name">
            @if (nameControl?.hasError('required')) {
              O nome do produto é obrigatório.
            } @else if (nameControl?.hasError('minlength')) {
              O nome deve conter pelo menos 2 caracteres.
            } @else if (nameControl?.hasError('maxlength')) {
              O nome não pode exceder 255 caracteres.
            }
          </p>
        }
      </div>

      <!-- Category Selection -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label hlmLabel for="prod-category" class="text-xs font-semibold">
            Categoria <span class="text-destructive">*</span>
          </label>
          <button
            type="button"
            (click)="openCategoryManager.emit()"
            class="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
            data-testid="btn-manage-categories-from-form"
          >
            <ng-icon name="lucideFolderPlus" class="size-3" />
            <span>Gerenciar Categorias</span>
          </button>
        </div>

        <select
          id="prod-category"
          formControlName="categoryId"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="select-product-category"
        >
          <option value="" disabled>Selecione uma categoria...</option>
          @for (cat of availableCategories(); track cat.id) {
            <option [value]="cat.id">
              {{ cat.name }} {{ !cat.isActive ? '(Inativa)' : '' }}
            </option>
          }
        </select>

        @if (availableCategories().length === 0) {
          <p class="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Nenhuma categoria ativa cadastrada. Cadastre uma categoria antes de salvar o produto.
          </p>
        }

        @if (categoryControl?.invalid && (categoryControl?.dirty || categoryControl?.touched)) {
          <p class="text-xs text-destructive font-medium" data-testid="error-product-category">
            A categoria é obrigatória.
          </p>
        }
      </div>

      <!-- Type & Unit of Measure (Grid) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Item Type -->
        <div class="space-y-1.5">
          <label hlmLabel for="prod-type" class="text-xs font-semibold">
            Tipo de Item <span class="text-destructive">*</span>
          </label>
          <select
            id="prod-type"
            formControlName="type"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="select-product-type"
          >
            @for (opt of itemTypeOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>

        <!-- Unit of Measure -->
        <div class="space-y-1.5">
          <label hlmLabel for="prod-uom" class="text-xs font-semibold">
            Unidade de Medida <span class="text-destructive">*</span>
          </label>
          <select
            id="prod-uom"
            formControlName="unitOfMeasure"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="select-product-uom"
          >
            @for (uom of uomOptions; track uom.value) {
              <option [value]="uom.value">{{ uom.label }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Current Price -->
      <div class="space-y-1.5">
        <label hlmLabel for="prod-price" class="text-xs font-semibold">
          Preço de Venda (R$) <span class="text-destructive">*</span>
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-xs text-muted-foreground font-mono">R$</span>
          <input
            hlmInput
            id="prod-price"
            type="number"
            step="0.01"
            min="0"
            formControlName="currentPrice"
            placeholder="0,00"
            class="pl-9 font-mono text-sm w-full"
            data-testid="input-product-price"
          />
        </div>

        @if (isEditing()) {
          <p class="text-[11px] text-muted-foreground">
            Se alterar o preço, uma nova entrada será registrada automaticamente no histórico de preços.
          </p>
        }

        @if (priceControl?.invalid && (priceControl?.dirty || priceControl?.touched)) {
          <p class="text-xs text-destructive font-medium" data-testid="error-product-price">
            @if (priceControl?.hasError('required')) {
              O preço de venda é obrigatório.
            } @else if (priceControl?.hasError('min')) {
              O preço de venda não pode ser negativo.
            } @else if (priceControl?.hasError('pricePrecision')) {
              Informe um valor finito com até 2 casas decimais, no máximo 9.999.999.999,99.
            }
          </p>
        }
      </div>

      <!-- Description -->
      <div class="space-y-1.5">
        <label hlmLabel for="prod-desc" class="text-xs font-semibold">
          Descrição Detalhada <span class="text-muted-foreground text-[11px]">(opcional)</span>
        </label>
        <textarea
          id="prod-desc"
          formControlName="description"
          rows="3"
          placeholder="Especificações, modelo ou detalhes adicionais..."
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="input-product-description"
        ></textarea>
        @if (descControl?.hasError('maxlength')) {
          <p class="text-xs text-destructive font-medium">
            A descrição não pode exceder 500 caracteres.
          </p>
        }
      </div>

      <!-- Form Actions -->
      <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <button
          hlmBtn
          variant="outline"
          size="sm"
          type="button"
          (click)="cancel.emit()"
          data-testid="btn-cancel-product-form"
        >
          Cancelar
        </button>

        <button
          hlmBtn
          size="sm"
          type="submit"
          [disabled]="form.invalid || saving()"
          class="gap-1.5"
          data-testid="btn-save-product"
        >
          <ng-icon name="lucideCheck" class="size-4" />
          <span>{{ isEditing() ? 'Salvar Alterações' : 'Cadastrar Produto' }}</span>
        </button>
      </div>
    </form>
  `,
})
export class ProductFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly product = input<Product | null>(null);
  readonly categories = input<Category[]>([]);
  readonly saving = input<boolean>(false);

  readonly save = output<CreateProductDto | { id: string; dto: UpdateProductDto }>();
  readonly cancel = output<void>();
  readonly openCategoryManager = output<void>();

  readonly itemTypeOptions = ITEM_TYPE_OPTIONS;
  readonly uomOptions = UNIT_OF_MEASURE_OPTIONS;

  readonly isEditing = computed(() => !!this.product());

  readonly availableCategories = computed(() => {
    const list = this.categories();
    const currentProd = this.product();
    // Return active categories or, if editing, also include the product's current category even if inactive
    return list.filter((c) => c.isActive || (currentProd && currentProd.categoryId === c.id));
  });

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(500)]],
    categoryId: ['', [Validators.required]],
    type: ['PRODUCT_STOCK' as ItemType, [Validators.required]],
    unitOfMeasure: ['UNIT' as UnitOfMeasure, [Validators.required]],
    currentPrice: [null, [Validators.required, Validators.min(0),
      (control: AbstractControl) => isValidPrice(control.value) ? null : { pricePrecision: true }]],
  });

  readonly selectedType = toSignal(
    this.form.get('type')!.valueChanges,
    { initialValue: this.form.get('type')!.value as ItemType }
  );


  constructor() {
    effect(() => {
      const prod = this.product();
      if (prod) {
        this.form.reset({
          name: prod.name,
          description: prod.description || '',
          categoryId: prod.categoryId,
          type: prod.type,
          unitOfMeasure: prod.unitOfMeasure,
          currentPrice: Number(prod.currentPrice),
        });
      } else {
        this.form.reset({
          name: '',
          description: '',
          categoryId: '',
          type: 'PRODUCT_STOCK',
          unitOfMeasure: 'UNIT',
          currentPrice: null,
        });
      }

    });
  }

  get nameControl() {
    return this.form.get('name');
  }

  get categoryControl() {
    return this.form.get('categoryId');
  }

  get priceControl() {
    return this.form.get('currentPrice');
  }

  get descControl() {
    return this.form.get('description');
  }

  formatStock(val: string | number): string {
    return formatQuantity(val);
  }

  formatCost(val: string | number): string {
    return formatAverageCost(val);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const price = raw.currentPrice as number;

    if (this.isEditing()) {
      const prod = this.product()!;
      const dto: UpdateProductDto = {
        name: raw.name.trim(),
        description: raw.description?.trim() || '',
        categoryId: raw.categoryId,
        type: raw.type,
        unitOfMeasure: raw.unitOfMeasure,
      };
      if (price !== Number(prod.currentPrice)) dto.currentPrice = price;
      this.save.emit({ id: prod.id, dto });
    } else {
      const dto: CreateProductDto = {
        name: raw.name.trim(),
        description: raw.description?.trim() ? raw.description.trim() : undefined,
        categoryId: raw.categoryId,
        type: raw.type,
        unitOfMeasure: raw.unitOfMeasure,
        currentPrice: price,
      };
      this.save.emit(dto);
    }
  }
}
