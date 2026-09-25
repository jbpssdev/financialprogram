import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  CreateSupplierDto,
  Supplier,
  SupplierFilters,
  SupplierStatusFilter,
  UpdateSupplierDto,
} from './suppliers.models';
import { SuppliersService } from './suppliers.service';

@Injectable()
export class SuppliersStore {
  private readonly suppliersService = inject(SuppliersService);

  // State signals
  readonly suppliers = signal<Supplier[]>([]);
  readonly selectedSupplier = signal<Supplier | null>(null);

  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly initialized = signal<boolean>(false);

  readonly filterSearch = signal<string>('');
  readonly filterStatus = signal<SupplierStatusFilter>('ALL');

  // Computed signals
  readonly totalCount = computed(() => this.suppliers().length);
  readonly activeCount = computed(() => this.suppliers().filter((s) => s.isActive).length);
  readonly inactiveCount = computed(() => this.suppliers().filter((s) => !s.isActive).length);

  readonly filters = computed<SupplierFilters>(() => ({
    search: this.filterSearch(),
    status: this.filterStatus(),
  }));

  readonly filteredSuppliers = computed(() => {
    const list = this.suppliers();
    const search = this.filterSearch().trim().toLowerCase();
    const status = this.filterStatus();

    return list.filter((supplier) => {
      // 1. Text Search (name, contactName, email, phone)
      if (search) {
        const nameMatch = supplier.name.toLowerCase().includes(search);
        const contactMatch = supplier.contactName
          ? supplier.contactName.toLowerCase().includes(search)
          : false;
        const emailMatch = supplier.email
          ? supplier.email.toLowerCase().includes(search)
          : false;
        const phoneMatch = supplier.phone
          ? supplier.phone.toLowerCase().includes(search)
          : false;
        if (!nameMatch && !contactMatch && !emailMatch && !phoneMatch) {
          return false;
        }
      }

      // 2. Status filter
      if (status === 'ACTIVE' && !supplier.isActive) return false;
      if (status === 'INACTIVE' && supplier.isActive) return false;

      return true;
    });
  });

  // Actions
  loadSuppliers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.suppliersService
      .getSuppliers()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => {
          this.suppliers.set(list);
          this.initialized.set(true);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Erro ao carregar lista de fornecedores.';
          this.error.set(msg);
        },
      });
  }

  createSupplier(dto: CreateSupplierDto): Observable<Supplier> {
    this.saving.set(true);
    return this.suppliersService.createSupplier(dto).pipe(
      tap((created) => {
        this.suppliers.update((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  updateSupplier(id: string, dto: UpdateSupplierDto): Observable<Supplier> {
    this.saving.set(true);
    return this.suppliersService.updateSupplier(id, dto).pipe(
      tap((updated) => {
        this.suppliers.update((current) =>
          current.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)),
        );
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  toggleActive(supplier: Supplier): Observable<Supplier> {
    return this.updateSupplier(supplier.id, { isActive: !supplier.isActive });
  }

  // Filter setters
  setFilterSearch(search: string): void {
    this.filterSearch.set(search);
  }

  setFilterStatus(status: SupplierStatusFilter): void {
    this.filterStatus.set(status);
  }

  clearFilters(): void {
    this.filterSearch.set('');
    this.filterStatus.set('ALL');
  }
}
