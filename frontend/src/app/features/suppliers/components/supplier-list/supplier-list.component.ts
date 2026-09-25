import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideBuilding2,
  lucideMail,
  lucidePencil,
  lucidePhone,
  lucidePlus,
  lucidePower,
  lucideSearch,
  lucideUser,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import {
  Supplier,
  SupplierFilters,
  SupplierStatusFilter,
} from '../../suppliers.models';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    HlmTableImports,
    HlmButton,
    HlmInput,
    HlmBadge,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideX,
      lucidePlus,
      lucidePencil,
      lucidePower,
      lucideBuilding2,
      lucideUser,
      lucidePhone,
      lucideMail,
      lucideAlertCircle,
    }),
  ],
  template: `
    <div class="space-y-4">
      <!-- Toolbar: Search and Filters -->
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-lg border border-border bg-card p-3.5 shadow-2xs">
        <div class="flex flex-1 flex-col sm:flex-row gap-3">
          <!-- 1. Search Field -->
          <div class="relative flex-1 max-w-md">
            <ng-icon
              name="lucideSearch"
              class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <input
              hlmInput
              type="text"
              [ngModel]="filters().search"
              (ngModelChange)="searchChange.emit($event)"
              placeholder="Buscar por nome, contato, e-mail..."
              class="pl-9 w-full text-sm"
              data-testid="supplier-search-input"
            />
            @if (filters().search) {
              <button
                type="button"
                (click)="searchChange.emit('')"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <ng-icon name="lucideX" class="size-3.5" />
              </button>
            }
          </div>

          <!-- 2. Status Filter -->
          <div class="w-full sm:w-48">
            <select
              hlmInput
              [ngModel]="filters().status"
              (ngModelChange)="statusChange.emit($event)"
              class="w-full text-sm bg-background border-input"
              data-testid="supplier-status-select"
              aria-label="Filtrar por situação do fornecedor"
            >
              <option value="ALL">Todas as situações</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </div>

          @if (hasActiveFilters()) {
            <button
              hlmBtn
              variant="ghost"
              size="sm"
              (click)="clearFilters.emit()"
              class="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground self-start sm:self-center"
              data-testid="btn-clear-supplier-filters"
            >
              <ng-icon name="lucideX" class="size-3.5 mr-1" />
              Limpar filtros
            </button>
          }
        </div>

        <!-- Add Supplier Button -->
        <button
          hlmBtn
          variant="default"
          size="sm"
          class="h-9 whitespace-nowrap self-end sm:self-center"
          (click)="create.emit()"
          data-testid="btn-create-supplier-top"
        >
          <ng-icon name="lucidePlus" class="size-4 mr-1.5" />
          Novo Fornecedor
        </button>
      </div>

      <!-- Suppliers Table Container -->
      <div class="rounded-lg border border-border bg-card shadow-2xs overflow-hidden">
        <div class="overflow-x-auto">
          <table hlmTable class="w-full text-left text-sm" data-testid="suppliers-table">
            <thead hlmThead class="bg-muted/40 border-b border-border">
              <tr hlmTr>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground">Fornecedor</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground">Contato</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground">Telefone</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground">E-mail</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground text-center">Situação</th>
                <th hlmTh scope="col" class="py-3 px-4 font-semibold text-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody hlmTbody class="divide-y divide-border">
              <!-- SKELETON LOADING -->
              @if (loading()) {
                @for (i of [1, 2, 3, 4]; track i) {
                  <tr hlmTr class="animate-pulse">
                    <td hlmTd class="py-3 px-4">
                      <div class="h-4 w-40 bg-muted rounded mb-1"></div>
                      <div class="h-3 w-24 bg-muted/60 rounded"></div>
                    </td>
                    <td hlmTd class="py-3 px-4"><div class="h-4 w-28 bg-muted rounded"></div></td>
                    <td hlmTd class="py-3 px-4"><div class="h-4 w-24 bg-muted rounded"></div></td>
                    <td hlmTd class="py-3 px-4"><div class="h-4 w-32 bg-muted rounded"></div></td>
                    <td hlmTd class="py-3 px-4 text-center"><div class="h-5 w-16 bg-muted rounded mx-auto"></div></td>
                    <td hlmTd class="py-3 px-4 text-right"><div class="h-8 w-20 bg-muted rounded ml-auto"></div></td>
                  </tr>
                }
              } @else if (suppliers().length === 0) {
                <!-- EMPTY STATE -->
                <tr>
                  <td colspan="6" class="py-12 text-center text-muted-foreground" data-testid="suppliers-empty-state">
                    <div class="flex flex-col items-center justify-center space-y-2">
                      <ng-icon name="lucideBuilding2" class="size-8 text-muted-foreground/60" />
                      @if (hasActiveFilters()) {
                        <p class="font-medium text-foreground">Nenhum fornecedor encontrado com os filtros informados.</p>
                        <p class="text-xs text-muted-foreground">Tente alterar os termos de busca ou a situação selecionada.</p>
                        <button
                          hlmBtn
                          variant="outline"
                          size="sm"
                          class="mt-2"
                          (click)="clearFilters.emit()"
                        >
                          Limpar filtros
                        </button>
                      } @else {
                        <p class="font-medium text-foreground">Nenhum fornecedor cadastrado.</p>
                        <p class="text-xs text-muted-foreground">Cadastre fornecedores para utilizá-los no módulo de compras e suprimentos.</p>
                        <button
                          hlmBtn
                          variant="default"
                          size="sm"
                          class="mt-2"
                          (click)="create.emit()"
                          data-testid="btn-create-first-supplier"
                        >
                          <ng-icon name="lucidePlus" class="size-4 mr-1.5" />
                          Cadastrar primeiro fornecedor
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @else {
                <!-- SUPPLIERS ROWS -->
                @for (supplier of suppliers(); track supplier.id) {
                  <tr
                    hlmTr
                    class="hover:bg-muted/30 transition-colors"
                    [attr.data-testid]="'supplier-row-' + supplier.id"
                  >
                    <!-- Fornecedor (Nome + Notas) -->
                    <td hlmTd class="py-3 px-4">
                      <div class="font-medium text-foreground flex items-center gap-1.5">
                        <span>{{ supplier.name }}</span>
                        @if (!supplier.isActive) {
                          <span class="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-normal">
                            Inativo
                          </span>
                        }
                      </div>
                      @if (supplier.notes) {
                        <p class="text-xs text-muted-foreground line-clamp-1">
                          {{ supplier.notes }}
                        </p>
                      }
                    </td>

                    <!-- Contato -->
                    <td hlmTd class="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      @if (supplier.contactName) {
                        <span class="text-xs">{{ supplier.contactName }}</span>
                      } @else {
                        <span class="text-xs text-muted-foreground/60">—</span>
                      }
                    </td>

                    <!-- Telefone -->
                    <td hlmTd class="py-3 px-4 text-muted-foreground whitespace-nowrap font-mono text-xs">
                      @if (supplier.phone) {
                        <span>{{ supplier.phone }}</span>
                      } @else {
                        <span class="text-muted-foreground/60 font-sans">—</span>
                      }
                    </td>

                    <!-- E-mail -->
                    <td hlmTd class="py-3 px-4 text-muted-foreground whitespace-nowrap text-xs">
                      @if (supplier.email) {
                        <span>{{ supplier.email }}</span>
                      } @else {
                        <span class="text-muted-foreground/60">—</span>
                      }
                    </td>

                    <!-- Situação -->
                    <td hlmTd class="py-3 px-4 text-center whitespace-nowrap">
                      @if (supplier.isActive) {
                        <span hlmBadge variant="default" class="text-[11px] py-0 bg-emerald-600 hover:bg-emerald-700 text-white">
                          Ativo
                        </span>
                      } @else {
                        <span hlmBadge variant="outline" class="text-[11px] py-0 text-muted-foreground border-border">
                          Inativo
                        </span>
                      }
                    </td>

                    <!-- Ações -->
                    <td hlmTd class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1">
                        <!-- Editar -->
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon"
                          class="size-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          (click)="edit.emit(supplier)"
                          title="Editar fornecedor"
                          aria-label="Editar fornecedor"
                          [attr.data-testid]="'btn-edit-supplier-' + supplier.id"
                        >
                          <ng-icon name="lucidePencil" class="size-4" />
                        </button>

                        <!-- Ativar / Inativar -->
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon"
                          class="size-8 hover:bg-muted"
                          [class.text-amber-600]="supplier.isActive"
                          [class.text-emerald-600]="!supplier.isActive"
                          (click)="toggleStatus.emit(supplier)"
                          [title]="supplier.isActive ? 'Inativar fornecedor' : 'Reativar fornecedor'"
                          [attr.aria-label]="supplier.isActive ? 'Inativar fornecedor' : 'Reativar fornecedor'"
                          [attr.data-testid]="'btn-toggle-supplier-' + supplier.id"
                        >
                          <ng-icon name="lucidePower" class="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class SupplierListComponent {
  readonly suppliers = input.required<Supplier[]>();
  readonly filters = input.required<SupplierFilters>();
  readonly loading = input<boolean>(false);

  // Events
  readonly create = output<void>();
  readonly edit = output<Supplier>();
  readonly toggleStatus = output<Supplier>();
  readonly searchChange = output<string>();
  readonly statusChange = output<SupplierStatusFilter>();
  readonly clearFilters = output<void>();

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return f.search.trim().length > 0 || f.status !== 'ALL';
  });
}
