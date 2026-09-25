import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  CreateSupplierDto,
  Supplier,
  UpdateSupplierDto,
} from './suppliers.models';
import { SuppliersService } from './suppliers.service';
import { SuppliersStore } from './suppliers.store';

describe('SuppliersStore', () => {
  let store: SuppliersStore;
  let mockService: {
    getSuppliers: ReturnType<typeof vi.fn>;
    getSupplier: ReturnType<typeof vi.fn>;
    createSupplier: ReturnType<typeof vi.fn>;
    updateSupplier: ReturnType<typeof vi.fn>;
  };

  const mockSuppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'Ambev Distribuidora',
      contactName: 'Rodrigo Alves',
      phone: '11999990000',
      email: 'rodrigo@ambev.com',
      notes: 'Bebidas em geral',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sup-2',
      name: 'Coca-Cola FEMSA',
      contactName: 'Luciana Santos',
      phone: '11988881111',
      email: 'luciana@femsa.com',
      notes: null,
      isActive: false,
      createdAt: '2026-09-02T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    mockService = {
      getSuppliers: vi.fn().mockReturnValue(of(mockSuppliers)),
      getSupplier: vi.fn(),
      createSupplier: vi.fn(),
      updateSupplier: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SuppliersStore,
        { provide: SuppliersService, useValue: mockService },
      ],
    });

    store = TestBed.inject(SuppliersStore);
  });

  it('should initialize with default states', () => {
    expect(store.suppliers()).toEqual([]);
    expect(store.selectedSupplier()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.saving()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.initialized()).toBe(false);
    expect(store.filterSearch()).toBe('');
    expect(store.filterStatus()).toBe('ALL');
  });

  describe('loadSuppliers', () => {
    it('should load suppliers successfully', () => {
      store.loadSuppliers();

      expect(store.loading()).toBe(false);
      expect(store.suppliers()).toEqual(mockSuppliers);
      expect(store.initialized()).toBe(true);
      expect(store.error()).toBeNull();
      expect(store.totalCount()).toBe(2);
      expect(store.activeCount()).toBe(1);
      expect(store.inactiveCount()).toBe(1);
    });

    it('should handle load error gracefully', () => {
      mockService.getSuppliers.mockReturnValue(
        throwError(() => ({ error: { message: 'Erro de conexão' } })),
      );

      store.loadSuppliers();

      expect(store.loading()).toBe(false);
      expect(store.suppliers()).toEqual([]);
      expect(store.error()).toBe('Erro de conexão');
    });
  });

  describe('createSupplier', () => {
    it('should add created supplier to list', () => {
      store.loadSuppliers();

      const newSupplier: Supplier = {
        id: 'sup-3',
        name: 'Brahma Express',
        contactName: null,
        phone: null,
        email: null,
        notes: null,
        isActive: true,
        createdAt: '2026-09-03T00:00:00Z',
        updatedAt: '2026-09-03T00:00:00Z',
      };

      mockService.createSupplier.mockReturnValue(of(newSupplier));

      const dto: CreateSupplierDto = { name: 'Brahma Express' };
      store.createSupplier(dto).subscribe();

      expect(store.suppliers().length).toBe(3);
      expect(store.suppliers().some((s) => s.id === 'sup-3')).toBe(true);
    });
  });

  describe('updateSupplier and toggleActive', () => {
    it('should update supplier in list', () => {
      store.loadSuppliers();

      const updated: Supplier = {
        ...mockSuppliers[0],
        name: 'Ambev Brasil Atualizada',
      };
      mockService.updateSupplier.mockReturnValue(of(updated));

      store.updateSupplier('sup-1', { name: 'Ambev Brasil Atualizada' }).subscribe();

      const found = store.suppliers().find((s) => s.id === 'sup-1');
      expect(found?.name).toBe('Ambev Brasil Atualizada');
    });

    it('should toggle supplier active status', () => {
      store.loadSuppliers();

      const toggled: Supplier = {
        ...mockSuppliers[0],
        isActive: false,
      };
      mockService.updateSupplier.mockReturnValue(of(toggled));

      store.toggleActive(mockSuppliers[0]).subscribe();

      const found = store.suppliers().find((s) => s.id === 'sup-1');
      expect(found?.isActive).toBe(false);
    });
  });

  describe('filters', () => {
    beforeEach(() => {
      store.loadSuppliers();
    });

    it('should filter by search text (name, contact, email)', () => {
      store.setFilterSearch('rodrigo');
      expect(store.filteredSuppliers().length).toBe(1);
      expect(store.filteredSuppliers()[0].id).toBe('sup-1');

      store.setFilterSearch('femsa');
      expect(store.filteredSuppliers().length).toBe(1);
      expect(store.filteredSuppliers()[0].id).toBe('sup-2');
    });

    it('should filter by active/inactive status', () => {
      store.setFilterStatus('ACTIVE');
      expect(store.filteredSuppliers().length).toBe(1);
      expect(store.filteredSuppliers()[0].id).toBe('sup-1');

      store.setFilterStatus('INACTIVE');
      expect(store.filteredSuppliers().length).toBe(1);
      expect(store.filteredSuppliers()[0].id).toBe('sup-2');
    });

    it('should clear all filters', () => {
      store.setFilterSearch('busca');
      store.setFilterStatus('ACTIVE');

      store.clearFilters();

      expect(store.filterSearch()).toBe('');
      expect(store.filterStatus()).toBe('ALL');
      expect(store.filteredSuppliers().length).toBe(2);
    });
  });
});
