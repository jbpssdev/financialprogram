import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  CreateStockAdjustmentDto,
  InventoryProduct,
  OpeningBalanceDto,
  OpeningBalanceResponse,
  StockAdjustmentResponse,
  StockMovement,
} from './inventory.models';
import { InventoryService } from './inventory.service';
import { InventoryStore } from './inventory.store';

describe('InventoryStore', () => {
  let store: InventoryStore;
  let mockService: {
    getInventoryOverview: ReturnType<typeof vi.fn>;
    getProductInventory: ReturnType<typeof vi.fn>;
    getProductMovements: ReturnType<typeof vi.fn>;
    setOpeningBalance: ReturnType<typeof vi.fn>;
    createAdjustment: ReturnType<typeof vi.fn>;
  };

  const mockItems: InventoryProduct[] = [
    {
      id: 'prod-1',
      name: 'Cerveja Lata',
      description: 'Lata 350ml',
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: '6.00',
      currentStock: '150.000',
      averageCost: '3.5000',
      stockValue: '525.00',
      potentialRevenue: '900.00',
      potentialGrossProfit: '375.00',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      category: { id: 'cat-1', name: 'Bebidas', description: null, isActive: true },
    },
    {
      id: 'prod-2',
      name: 'Refrigerante 2L',
      description: null,
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: '10.00',
      currentStock: '0.000',
      averageCost: '5.0000',
      stockValue: '0.00',
      potentialRevenue: '0.00',
      potentialGrossProfit: '0.00',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      category: { id: 'cat-1', name: 'Bebidas', description: null, isActive: true },
    },
    {
      id: 'prod-3',
      name: 'Música ao Vivo',
      description: 'Taxa artística',
      categoryId: 'cat-2',
      type: 'SERVICE',
      unitOfMeasure: 'UNIT',
      currentPrice: '15.00',
      currentStock: '0.000',
      averageCost: '0.0000',
      stockValue: '0.00',
      potentialRevenue: '0.00',
      potentialGrossProfit: '0.00',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      category: { id: 'cat-2', name: 'Serviços', description: null, isActive: true },
    },
  ];

  beforeEach(() => {
    mockService = {
      getInventoryOverview: vi.fn().mockReturnValue(of(mockItems)),
      getProductInventory: vi.fn(),
      getProductMovements: vi.fn().mockReturnValue(of([])),
      setOpeningBalance: vi.fn(),
      createAdjustment: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        InventoryStore,
        { provide: InventoryService, useValue: mockService },
      ],
    });

    store = TestBed.inject(InventoryStore);
  });

  it('should initialize with default states', () => {
    expect(store.items()).toEqual([]);
    expect(store.selectedItem()).toBeNull();
    expect(store.movements()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.initialized()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.filterSearch()).toBe('');
    expect(store.filterCategoryId()).toBe('ALL');
    expect(store.filterType()).toBe('ALL');
    expect(store.filterStockStatus()).toBe('ALL');
  });

  describe('loadInventory', () => {
    it('should load items successfully', () => {
      mockService.getInventoryOverview.mockReturnValue(of(mockItems));

      store.loadInventory();

      expect(store.loading()).toBe(false);
      expect(store.items()).toEqual(mockItems);
      expect(store.initialized()).toBe(true);
      expect(store.error()).toBeNull();
      expect(store.totalCount()).toBe(3);
      expect(store.inStockCount()).toBe(1);
      expect(store.outOfStockCount()).toBe(1);
      expect(store.servicesCount()).toBe(1);
    });

    it('should handle load error gracefully', () => {
      mockService.getInventoryOverview.mockReturnValue(
        throwError(() => ({ error: { message: 'Falha de conexão com servidor' } })),
      );

      store.loadInventory();

      expect(store.loading()).toBe(false);
      expect(store.items()).toEqual([]);
      expect(store.error()).toBe('Falha de conexão com servidor');
    });
  });

  describe('loadMovements and selectItem', () => {
    it('should load movements when item is selected', () => {
      const mockMovements: StockMovement[] = [
        {
          id: 'mov-1',
          productId: 'prod-1',
          purchaseItemId: null,
          saleItemId: null,
          type: 'INITIAL_BALANCE',
          quantity: '150.000',
          unitCost: '3.5000',
          totalCost: '525.00',
          averageCostAfter: '3.5000',
          balanceAfter: '150.000',
          stockValueAfter: '525.00',
          reason: 'Saldo inicial',
          movementDate: '2026-09-01T00:00:00Z',
          createdAt: '2026-09-01T00:00:00Z',
        },
      ];

      mockService.getProductMovements.mockReturnValue(of(mockMovements));

      store.selectItem(mockItems[0]);

      expect(store.selectedItem()).toEqual(mockItems[0]);
      expect(store.movements()).toEqual(mockMovements);
      expect(store.movementsLoading()).toBe(false);
      expect(store.movementsError()).toBeNull();
    });

    it('should clear movements when selected item is set to null', () => {
      store.selectItem(null);
      expect(store.selectedItem()).toBeNull();
      expect(store.movements()).toEqual([]);
    });

    it('should handle movements load error without breaking global state', () => {
      mockService.getProductMovements.mockReturnValue(
        throwError(() => ({ error: { message: 'Erro ao buscar histórico' } })),
      );

      store.selectItem(mockItems[0]);

      expect(store.movements()).toEqual([]);
      expect(store.movementsError()).toBe('Erro ao buscar histórico');
      expect(store.error()).toBeNull();
    });
  });

  describe('setOpeningBalance', () => {
    it('should update item and prepend movement on success', () => {
      mockService.getInventoryOverview.mockReturnValue(of(mockItems));
      store.loadInventory();
      store.selectItem(mockItems[1]);

      const updatedProd: InventoryProduct = {
        ...mockItems[1],
        currentStock: '50.000',
        averageCost: '4.8000',
        stockValue: '240.00',
      };
      const newMovement: StockMovement = {
        id: 'mov-new',
        productId: 'prod-2',
        purchaseItemId: null,
        saleItemId: null,
        type: 'INITIAL_BALANCE',
        quantity: '50.000',
        unitCost: '4.8000',
        totalCost: '240.00',
        averageCostAfter: '4.8000',
        balanceAfter: '50.000',
        stockValueAfter: '240.00',
        reason: 'Saldo inicial',
        movementDate: '2026-09-01T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
      };

      const res: OpeningBalanceResponse = { product: updatedProd, movement: newMovement };
      mockService.setOpeningBalance.mockReturnValue(of(res));

      const dto: OpeningBalanceDto = { productId: 'prod-2', quantity: 50, unitCost: 4.8 };
      store.setOpeningBalance(dto).subscribe();

      expect(store.items().find((i) => i.id === 'prod-2')?.currentStock).toBe('50.000');
      expect(store.selectedItem()?.currentStock).toBe('50.000');
      expect(store.movements()[0]).toEqual(newMovement);
    });
  });

  describe('createAdjustment', () => {
    it('should update item and prepend movement on successful adjustment', () => {
      mockService.getInventoryOverview.mockReturnValue(of(mockItems));
      store.loadInventory();
      store.selectItem(mockItems[0]);

      const updatedProd: InventoryProduct = {
        ...mockItems[0],
        currentStock: '140.000',
        stockValue: '490.00',
      };
      const newMovement: StockMovement = {
        id: 'mov-adj',
        productId: 'prod-1',
        purchaseItemId: null,
        saleItemId: null,
        type: 'ADJUSTMENT_NEGATIVE',
        quantity: '-10.000',
        unitCost: '3.5000',
        totalCost: '35.00',
        averageCostAfter: '3.5000',
        balanceAfter: '140.000',
        stockValueAfter: '490.00',
        reason: 'Ajuste negativo',
        movementDate: '2026-09-01T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
      };

      const res: StockAdjustmentResponse = { product: updatedProd, movement: newMovement };
      mockService.createAdjustment.mockReturnValue(of(res));

      const dto: CreateStockAdjustmentDto = {
        productId: 'prod-1',
        type: 'ADJUSTMENT_NEGATIVE',
        quantity: 10,
        reason: 'Falta identificada na contagem',
      };
      store.createAdjustment(dto).subscribe();

      expect(store.items().find((i) => i.id === 'prod-1')?.currentStock).toBe('140.000');
      expect(store.selectedItem()?.currentStock).toBe('140.000');
      expect(store.movements()[0]).toEqual(newMovement);
    });
  });

  describe('filtering and clearing filters', () => {
    beforeEach(() => {
      mockService.getInventoryOverview.mockReturnValue(of(mockItems));
      store.loadInventory();
    });

    it('should filter by search text', () => {
      store.setFilterSearch('cerveja');
      expect(store.filteredItems().length).toBe(1);
      expect(store.filteredItems()[0].id).toBe('prod-1');

      store.setFilterSearch('bebidas');
      expect(store.filteredItems().length).toBe(2);
    });

    it('should filter by category', () => {
      store.setFilterCategoryId('cat-2');
      expect(store.filteredItems().length).toBe(1);
      expect(store.filteredItems()[0].name).toBe('Música ao Vivo');
    });

    it('should filter by item type', () => {
      store.setFilterType('SERVICE');
      expect(store.filteredItems().length).toBe(1);
      expect(store.filteredItems()[0].id).toBe('prod-3');
    });

    it('should filter by stock status', () => {
      store.setFilterStockStatus('IN_STOCK');
      expect(store.filteredItems().length).toBe(1);
      expect(store.filteredItems()[0].id).toBe('prod-1');

      store.setFilterStockStatus('OUT_OF_STOCK');
      expect(store.filteredItems().length).toBe(1);
      expect(store.filteredItems()[0].id).toBe('prod-2');

      store.setFilterStockStatus('SERVICE');
      expect(store.filteredItems().length).toBe(1);
      expect(store.filteredItems()[0].id).toBe('prod-3');
    });

    it('should clear all filters', () => {
      store.setFilterSearch('qualquer');
      store.setFilterCategoryId('cat-1');
      store.setFilterType('PRODUCT_STOCK');
      store.setFilterStockStatus('IN_STOCK');

      store.clearFilters();

      expect(store.filterSearch()).toBe('');
      expect(store.filterCategoryId()).toBe('ALL');
      expect(store.filterType()).toBe('ALL');
      expect(store.filterStockStatus()).toBe('ALL');
      expect(store.filteredItems().length).toBe(3);
    });
  });
});
