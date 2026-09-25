import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucidePencil,
  lucidePlus,
  lucidePower,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../../products.models';

@Component({
  selector: 'app-category-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    HlmButton,
    HlmInput,
    HlmLabel,
    HlmBadge,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucidePlus,
      lucidePencil,
      lucideCheck,
      lucideX,
      lucidePower,
    }),
  ],
  template: `
    <div class="space-y-6">
      <!-- Create New Category Card -->
      <div class="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nova Categoria
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <label hlmLabel for="cat-name-input" class="text-xs">
              Nome da Categoria <span class="text-destructive">*</span>
            </label>
            <input
              hlmInput
              id="cat-name-input"
              type="text"
              placeholder="Ex: Bebidas, Sobremesas..."
              [ngModel]="newCategoryName()"
              (ngModelChange)="onNewNameChange($event)"
              class="w-full text-xs h-8"
              data-testid="input-category-name"
            />
          </div>

          <div class="space-y-1">
            <label hlmLabel for="cat-desc-input" class="text-xs">
              Descrição (Opcional)
            </label>
            <input
              hlmInput
              id="cat-desc-input"
              type="text"
              placeholder="Ex: Cervejas e refrigerantes"
              [ngModel]="newCategoryDesc()"
              (ngModelChange)="newCategoryDesc.set($event)"
              class="w-full text-xs h-8"
              data-testid="input-category-desc"
            />
          </div>
        </div>

        @if (formError()) {
          <p class="text-xs text-destructive font-medium" data-testid="category-form-error">
            {{ formError() }}
          </p>
        }

        <div class="flex justify-end pt-1">
          <button
            hlmBtn
            size="sm"
            (click)="onSubmitCreate()"
            [disabled]="saving()"
            class="gap-1.5 text-xs h-8"
            data-testid="btn-create-category"
          >
            <ng-icon name="lucidePlus" class="size-3.5" />
            <span>Adicionar Categoria</span>
          </button>
        </div>
      </div>

      <!-- Categories List -->
      <div class="space-y-3">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categorias Cadastradas ({{ categories().length }})
        </h4>

        @if (categories().length === 0) {
          <div class="text-center py-6 border border-dashed border-border rounded-lg bg-card text-muted-foreground text-xs">
            Nenhuma categoria cadastrada ainda. Crie a primeira acima.
          </div>
        } @else {
          <div class="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
            @for (cat of categories(); track cat.id) {
              <div
                class="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
                [attr.data-testid]="'category-row-' + cat.id"
              >
                <!-- Edit Mode for this category -->
                @if (editingCategoryId() === cat.id) {
                  <div class="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      hlmInput
                      type="text"
                      [ngModel]="editingName()"
                      (ngModelChange)="editingName.set($event)"
                      class="text-xs h-7"
                      placeholder="Nome"
                      data-testid="input-edit-category-name"
                    />
                    <input
                      hlmInput
                      type="text"
                      [ngModel]="editingDesc()"
                      (ngModelChange)="editingDesc.set($event)"
                      class="text-xs h-7"
                      placeholder="Descrição"
                      data-testid="input-edit-category-desc"
                    />
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button
                      hlmBtn
                      size="icon-sm"
                      variant="ghost"
                      (click)="onSaveEdit(cat.id)"
                      [disabled]="saving()"
                      aria-label="Salvar alteração"
                      class="text-emerald-600 hover:text-emerald-700 size-7"
                      data-testid="btn-save-edit-category"
                    >
                      <ng-icon name="lucideCheck" class="size-3.5" />
                    </button>
                    <button
                      hlmBtn
                      size="icon-sm"
                      variant="ghost"
                      (click)="onCancelEdit()"
                      aria-label="Cancelar alteração"
                      class="text-muted-foreground hover:text-foreground size-7"
                      data-testid="btn-cancel-edit-category"
                    >
                      <ng-icon name="lucideX" class="size-3.5" />
                    </button>
                  </div>
                } @else {
                  <!-- Display Mode -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-xs text-foreground truncate">
                        {{ cat.name }}
                      </span>
                      <span
                        hlmBadge
                        [variant]="cat.isActive ? 'secondary' : 'outline'"
                        class="text-[10px] px-1.5 py-0"
                      >
                        {{ cat.isActive ? 'Ativa' : 'Inativa' }}
                      </span>
                    </div>
                    @if (cat.description) {
                      <p class="text-[11px] text-muted-foreground truncate mt-0.5">
                        {{ cat.description }}
                      </p>
                    }
                  </div>

                  <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span class="text-[11px] text-muted-foreground font-mono mr-2">
                      {{ cat._count?.products ?? 0 }} {{ (cat._count?.products ?? 0) === 1 ? 'produto' : 'produtos' }}
                    </span>

                    <button
                      hlmBtn
                      size="icon-sm"
                      variant="ghost"
                      (click)="onStartEdit(cat)"
                      aria-label="Editar categoria"
                      class="text-muted-foreground hover:text-foreground size-7"
                      data-testid="btn-edit-category"
                    >
                      <ng-icon name="lucidePencil" class="size-3.5" />
                    </button>

                    <button
                      hlmBtn
                      size="sm"
                      variant="outline"
                      (click)="toggleActive.emit(cat)"
                      [disabled]="saving()"
                      class="text-[11px] h-7 px-2"
                      [ngClass]="{
                        'text-destructive hover:bg-destructive/10 border-destructive/30': cat.isActive,
                        'text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30': !cat.isActive
                      }"
                      data-testid="btn-toggle-category-status"
                    >
                      {{ cat.isActive ? 'Inativar' : 'Ativar' }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class CategoryManagerComponent {
  readonly categories = input.required<Category[]>();
  readonly saving = input<boolean>(false);

  readonly createCategory = output<CreateCategoryDto>();
  readonly updateCategory = output<{ id: string; dto: UpdateCategoryDto }>();
  readonly toggleActive = output<Category>();

  readonly newCategoryName = signal<string>('');
  readonly newCategoryDesc = signal<string>('');
  readonly formError = signal<string | null>(null);

  readonly editingCategoryId = signal<string | null>(null);
  readonly editingName = signal<string>('');
  readonly editingDesc = signal<string>('');

  onNewNameChange(val: string): void {
    this.newCategoryName.set(val);
    if (this.formError()) {
      this.formError.set(null);
    }
  }

  onSubmitCreate(): void {
    const name = this.newCategoryName().trim();
    if (!name) {
      this.formError.set('O nome da categoria é obrigatório e não pode ser vazio.');
      return;
    }

    const desc = this.newCategoryDesc().trim();
    this.createCategory.emit({
      name,
      description: desc || undefined,
    });

    this.newCategoryName.set('');
    this.newCategoryDesc.set('');
    this.formError.set(null);
  }

  onStartEdit(cat: Category): void {
    this.editingCategoryId.set(cat.id);
    this.editingName.set(cat.name);
    this.editingDesc.set(cat.description || '');
  }

  onCancelEdit(): void {
    this.editingCategoryId.set(null);
    this.editingName.set('');
    this.editingDesc.set('');
  }

  onSaveEdit(id: string): void {
    const name = this.editingName().trim();
    if (!name) {
      return;
    }
    const desc = this.editingDesc().trim();
    this.updateCategory.emit({
      id,
      dto: {
        name,
        description: desc || undefined,
      },
    });
    this.onCancelEdit();
  }
}
