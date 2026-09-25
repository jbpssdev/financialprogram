import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  CreateStockAdjustmentDto,
  InventoryProduct,
  OpeningBalanceDto,
  OpeningBalanceResponse,
  StockAdjustmentResponse,
  StockMovement,
} from './inventory.models';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:3000/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InventoryService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });

    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch inventory overview via GET /inventory', () => {
    const mockOverview: InventoryProduct[] = [
      {
        id: 'prod-1',
        name: 'Item A',
        description: 'Test',
        categoryId: 'cat-1',
        type: 'PRODUCT_STOCK',
        unitOfMeasure: 'UNIT',
        currentPrice: '10.00',
        currentStock: '50.000',
        averageCost: '4.5000',
        stockValue: '225.00',
        potentialRevenue: '500.00',
        potentialGrossProfit: '275.00',
        isActive: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    service.getInventoryOverview().subscribe((items) => {
      expect(items).toEqual(mockOverview);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory`);
    expect(req.request.method).toBe('GET');
    req.flush(mockOverview);
  });

  it('should fetch product inventory via GET /inventory/:productId', () => {
    const mockProduct: InventoryProduct = {
      id: 'prod-1',
      name: 'Item A',
      description: null,
      categoryId: 'cat-1',
      type: 'PRODUCT_STOCK',
      unitOfMeasure: 'UNIT',
      currentPrice: '10.00',
      currentStock: '50.000',
      averageCost: '4.5000',
      stockValue: '225.00',
      potentialRevenue: '500.00',
      potentialGrossProfit: '275.00',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    service.getProductInventory('prod-1').subscribe((item) => {
      expect(item).toEqual(mockProduct);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/prod-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
  });

  it('should fetch movements via GET /inventory/:productId/movements', () => {
    const mockMovements: StockMovement[] = [
      {
        id: 'mov-1',
        productId: 'prod-1',
        purchaseItemId: null,
        saleItemId: null,
        type: 'INITIAL_BALANCE',
        quantity: '50.000',
        unitCost: '4.5000',
        totalCost: '225.00',
        averageCostAfter: '4.5000',
        balanceAfter: '50.000',
        stockValueAfter: '225.00',
        reason: 'Saldo inicial de implantação',
        movementDate: '2026-09-01T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
      },
    ];

    service.getProductMovements('prod-1').subscribe((movs) => {
      expect(movs).toEqual(mockMovements);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/prod-1/movements`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMovements);
  });

  it('should post opening balance via POST /inventory/opening-balance', () => {
    const dto: OpeningBalanceDto = {
      productId: 'prod-1',
      quantity: 100,
      unitCost: 5.5,
    };

    const mockResponse: OpeningBalanceResponse = {
      product: {
        id: 'prod-1',
        name: 'Item A',
        description: null,
        categoryId: 'cat-1',
        type: 'PRODUCT_STOCK',
        unitOfMeasure: 'UNIT',
        currentPrice: '12.00',
        currentStock: '100.000',
        averageCost: '5.5000',
        stockValue: '550.00',
        potentialRevenue: '1200.00',
        potentialGrossProfit: '650.00',
        isActive: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      movement: {
        id: 'mov-1',
        productId: 'prod-1',
        purchaseItemId: null,
        saleItemId: null,
        type: 'INITIAL_BALANCE',
        quantity: '100.000',
        unitCost: '5.5000',
        totalCost: '550.00',
        averageCostAfter: '5.5000',
        balanceAfter: '100.000',
        stockValueAfter: '550.00',
        reason: 'Saldo inicial de implantação',
        movementDate: '2026-09-01T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
      },
    };

    service.setOpeningBalance(dto).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/opening-balance`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockResponse);
  });

  it('should post stock adjustment via POST /inventory/adjustments', () => {
    const dto: CreateStockAdjustmentDto = {
      productId: 'prod-1',
      type: 'ADJUSTMENT_POSITIVE',
      quantity: 10,
      reason: 'Sobra identificada em inventário físico',
    };

    const mockResponse: StockAdjustmentResponse = {
      product: {
        id: 'prod-1',
        name: 'Item A',
        description: null,
        categoryId: 'cat-1',
        type: 'PRODUCT_STOCK',
        unitOfMeasure: 'UNIT',
        currentPrice: '12.00',
        currentStock: '110.000',
        averageCost: '5.5000',
        stockValue: '605.00',
        potentialRevenue: '1320.00',
        potentialGrossProfit: '715.00',
        isActive: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      movement: {
        id: 'mov-2',
        productId: 'prod-1',
        purchaseItemId: null,
        saleItemId: null,
        type: 'ADJUSTMENT_POSITIVE',
        quantity: '10.000',
        unitCost: '5.5000',
        totalCost: '55.00',
        averageCostAfter: '5.5000',
        balanceAfter: '110.000',
        stockValueAfter: '605.00',
        reason: 'Sobra identificada em inventário físico',
        movementDate: '2026-09-01T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
      },
    };

    service.createAdjustment(dto).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/adjustments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockResponse);
  });
});
