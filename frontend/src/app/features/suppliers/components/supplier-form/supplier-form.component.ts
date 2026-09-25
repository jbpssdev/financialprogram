import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
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
  lucideBuilding2,
  lucideCheck,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import {
  CreateSupplierDto,
  Supplier,
  UpdateSupplierDto,
} from '../../suppliers.models';

@Component({
  selector: 'app-supplier-form',
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
      lucideBuilding2,
      lucideX,
      lucideCheck,
      lucideAlertCircle,
    }),
  ],
  template: `
    <div class="space-y-5" data-testid="supplier-form-container">
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-border pb-3">
        <div>
          <div class="flex items-center gap-2">
            <ng-icon name="lucideBuilding2" class="size-5 text-primary" />
            <h2 class="text-lg font-semibold text-foreground">
              {{ isEditing() ? 'Editar Fornecedor' : 'Novo Fornecedor' }}
            </h2>
          </div>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ isEditing() ? 'Atualize as informações cadastrais do parceiro.' : 'Preencha os dados cadastrais para registrar o fornecedor.' }}
          </p>
        </div>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="size-8 text-muted-foreground hover:text-foreground"
          (click)="cancel.emit()"
          aria-label="Fechar formulário"
          data-testid="btn-close-supplier-form"
        >
          <ng-icon name="lucideX" class="size-4" />
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- 1. Nome do Fornecedor -->
        <div class="space-y-1.5">
          <label hlmLabel for="supplier-name" class="text-sm font-medium text-foreground">
            Razão Social / Nome Fantasia *
          </label>
          <input
            id="supplier-name"
            hlmInput
            type="text"
            formControlName="name"
            placeholder="Ex: Cervejaria Central Ltda"
            class="w-full text-sm"
            data-testid="supplier-name-input"
          />
          @if (form.controls.name.touched && form.controls.name.errors) {
            <p class="text-xs text-destructive flex items-center gap-1">
              <ng-icon name="lucideAlertCircle" class="size-3" />
              O nome do fornecedor é obrigatório.
            </p>
          }
        </div>

        <!-- 2. Nome do Contato -->
        <div class="space-y-1.5">
          <label hlmLabel for="supplier-contact" class="text-sm font-medium text-foreground">
            Nome do Contato (opcional)
          </label>
          <input
            id="supplier-contact"
            hlmInput
            type="text"
            formControlName="contactName"
            placeholder="Ex: Carlos Silva"
            class="w-full text-sm"
            data-testid="supplier-contact-input"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- 3. Telefone -->
          <div class="space-y-1.5">
            <label hlmLabel for="supplier-phone" class="text-sm font-medium text-foreground">
              Telefone / WhatsApp (opcional)
            </label>
            <input
              id="supplier-phone"
              hlmInput
              type="text"
              formControlName="phone"
              placeholder="Ex: (11) 99999-8888"
              class="w-full text-sm font-mono"
              data-testid="supplier-phone-input"
            />
          </div>

          <!-- 4. E-mail -->
          <div class="space-y-1.5">
            <label hlmLabel for="supplier-email" class="text-sm font-medium text-foreground">
              E-mail de Contato (opcional)
            </label>
            <input
              id="supplier-email"
              hlmInput
              type="email"
              formControlName="email"
              placeholder="Ex: vendas@fornecedor.com"
              class="w-full text-sm"
              data-testid="supplier-email-input"
            />
            @if (form.controls.email.touched && form.controls.email.errors?.['email']) {
              <p class="text-xs text-destructive flex items-center gap-1">
                <ng-icon name="lucideAlertCircle" class="size-3" />
                Informe um e-mail válido.
              </p>
            }
          </div>
        </div>

        <!-- 5. Observações -->
        <div class="space-y-1.5">
          <label hlmLabel for="supplier-notes" class="text-sm font-medium text-foreground">
            Observações e Prazos de Entrega (opcional)
          </label>
          <textarea
            id="supplier-notes"
            hlmInput
            formControlName="notes"
            rows="3"
            placeholder="Ex: Dias de entrega às terças e quintas; faturamento 14 dias..."
            class="w-full text-sm resize-none"
            data-testid="supplier-notes-input"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            hlmBtn
            variant="outline"
            (click)="cancel.emit()"
            [disabled]="saving()"
            data-testid="btn-cancel-supplier"
          >
            Cancelar
          </button>
          <button
            type="submit"
            hlmBtn
            variant="default"
            [disabled]="form.invalid || saving()"
            data-testid="btn-submit-supplier"
          >
            @if (saving()) {
              <span>Salvando...</span>
            } @else {
              <ng-icon name="lucideCheck" class="size-4 mr-1.5" />
              <span>{{ isEditing() ? 'Salvar Alterações' : 'Cadastrar Fornecedor' }}</span>
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class SupplierFormComponent {
  readonly supplier = input<Supplier | null>(null);
  readonly saving = input<boolean>(false);

  readonly save = output<CreateSupplierDto | UpdateSupplierDto>();
  readonly cancel = output<void>();

  readonly form = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, (control) => (control.value?.trim() ? null : { required: true })],
    }),
    contactName: new FormControl<string>('', { nonNullable: true }),
    phone: new FormControl<string>('', { nonNullable: true }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        (control) => {
          const val = control.value?.trim();
          if (!val) return null;
          return Validators.email({ value: val } as any);
        },
      ],
    }),
    notes: new FormControl<string>('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const s = this.supplier();
      if (s) {
        this.form.patchValue({
          name: s.name,
          contactName: s.contactName ?? '',
          phone: s.phone ?? '',
          email: s.email ?? '',
          notes: s.notes ?? '',
        });
      } else {
        this.form.reset({
          name: '',
          contactName: '',
          phone: '',
          email: '',
          notes: '',
        });
      }
    });
  }

  isEditing(): boolean {
    return !!this.supplier();
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    const values = this.form.getRawValue();
    const payload: CreateSupplierDto | UpdateSupplierDto = {
      name: values.name.trim(),
      contactName: values.contactName?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim().toLowerCase() || undefined,
      notes: values.notes?.trim() || undefined,
    };

    this.save.emit(payload);
  }
}
