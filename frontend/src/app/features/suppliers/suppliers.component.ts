import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideBuilding2,
  lucideCheckCircle2,
  lucideLayers,
  lucidePlus,
  lucideRefreshCw,
  lucideX,
  lucideXCircle,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { toast } from '@spartan-ng/helm/sonner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';
import { SupplierListComponent } from './components/supplier-list/supplier-list.component';
import {
  CreateSupplierDto,
  Supplier,
  UpdateSupplierDto,
} from './suppliers.models';
import { SuppliersStore } from './suppliers.store';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    PageHeaderComponent,
    SupplierListComponent,
    SupplierFormComponent,
    HlmButton,
    NgIcon,
  ],
  providers: [
    SuppliersStore,
    provideIcons({
      lucideBuilding2,
      lucideCheckCircle2,
      lucideXCircle,
      lucideLayers,
      lucidePlus,
      lucideRefreshCw,
      lucideAlertCircle,
      lucideX,
    }),
  ],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <app-page-header
        title="Fornecedores"
        description="Cadastro e homologação de parceiros e fornecedores comerciais."
      />

      <!-- Quick Metrics Summary Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-3.5 rounded-lg border border-border bg-card shadow-2xs flex items-center gap-3">
          <div class="p-2 rounded-md bg-primary/10 text-primary">
            <ng-icon name="lucideLayers" class="size-4" />
          </div>
          <div>
            <span class="text-xs text-muted-foreground block">Total de Fornecedores</span>
            <span class="text-lg font-bold text-foreground" data-testid="kpi-total-suppliers">
              {{ store.totalCount() }}
            </span>
          </div>
        </div>

        <div class="p-3.5 rounded-lg border border-border bg-card shadow-2xs flex items-center gap-3">
          <div class="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ng-icon name="lucideCheckCircle2" class="size-4" />
          </div>
          <div>
            <span class="text-xs text-muted-foreground block">Fornecedores Ativos</span>
            <span class="text-lg font-bold text-foreground" data-testid="kpi-active-suppliers">
              {{ store.activeCount() }}
            </span>
          </div>
        </div>

        <div class="p-3.5 rounded-lg border border-border bg-card shadow-2xs flex items-center gap-3">
          <div class="p-2 rounded-md bg-muted text-muted-foreground">
            <ng-icon name="lucideXCircle" class="size-4" />
          </div>
          <div>
            <span class="text-xs text-muted-foreground block">Fornecedores Inativos</span>
            <span class="text-lg font-bold text-foreground" data-testid="kpi-inactive-suppliers">
              {{ store.inactiveCount() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Global Error State -->
      @if (store.error(); as err) {
        <div
          class="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between"
          data-testid="suppliers-global-error"
        >
          <div class="flex items-center gap-2 text-sm font-medium">
            <ng-icon name="lucideAlertCircle" class="size-4" />
            <span>{{ err }}</span>
          </div>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            class="h-8 text-xs"
            (click)="store.loadSuppliers()"
          >
            <ng-icon name="lucideRefreshCw" class="size-3.5 mr-1.5" />
            Tentar novamente
          </button>
        </div>
      }

      <!-- Suppliers List -->
      <app-supplier-list
        [suppliers]="store.filteredSuppliers()"
        [filters]="store.filters()"
        [loading]="store.loading()"
        (create)="openCreateModal()"
        (edit)="openEditModal($event)"
        (toggleStatus)="onToggleStatus($event)"
        (searchChange)="store.setFilterSearch($event)"
        (statusChange)="store.setFilterStatus($event)"
        (clearFilters)="store.clearFilters()"
      />

      <!-- Supplier Form Modal (Create or Edit) -->
      @if (showModal()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          data-testid="modal-supplier-form"
        >
          <div
            class="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <app-supplier-form
              [supplier]="activeSupplier()"
              [saving]="store.saving()"
              (save)="onSaveSupplier($event)"
              (cancel)="closeModal()"
            />
          </div>
        </div>
      }
    </div>
  `,
})
export class SuppliersComponent implements OnInit {
  readonly store = inject(SuppliersStore);

  readonly showModal = signal<boolean>(false);
  readonly activeSupplier = signal<Supplier | null>(null);

  ngOnInit(): void {
    this.store.loadSuppliers();
  }

  openCreateModal(): void {
    this.activeSupplier.set(null);
    this.showModal.set(true);
  }

  openEditModal(supplier: Supplier): void {
    this.activeSupplier.set(supplier);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.activeSupplier.set(null);
  }

  onSaveSupplier(dto: CreateSupplierDto | UpdateSupplierDto): void {
    const current = this.activeSupplier();
    if (current) {
      this.store.updateSupplier(current.id, dto as UpdateSupplierDto).subscribe({
        next: () => {
          toast.success('Fornecedor atualizado com sucesso.');
          this.closeModal();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erro ao atualizar fornecedor.';
          toast.error(msg);
        },
      });
    } else {
      this.store.createSupplier(dto as CreateSupplierDto).subscribe({
        next: () => {
          toast.success('Fornecedor cadastrado com sucesso.');
          this.closeModal();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erro ao cadastrar fornecedor.';
          toast.error(msg);
        },
      });
    }
  }

  onToggleStatus(supplier: Supplier): void {
    this.store.toggleActive(supplier).subscribe({
      next: (updated) => {
        const action = updated.isActive ? 'reativado' : 'inativado';
        toast.success(`Fornecedor "${updated.name}" ${action} com sucesso.`);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Erro ao alterar status do fornecedor.';
        toast.error(msg);
      },
    });
  }
}
