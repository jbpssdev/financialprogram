import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemType, Prisma, SaleStatus, StockMovementType, UnitOfMeasure } from '@prisma/client';
import { PeriodLockService } from '../monthly-closings/period-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from './sales.service';

describe('SalesService', () => {
  let service: SalesService;

  const mockPeriodLockService = {
    assertPeriodOpen: jest.fn().mockResolvedValue(undefined),
    assertAllPeriodsOpen: jest.fn().mockResolvedValue(undefined),
    lockAndAssertPeriodOpen: jest.fn().mockResolvedValue('2026-09'),
    lockAndAssertAllPeriodsOpen: jest.fn().mockResolvedValue(['2026-09']),
  };

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    sale: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    saleItem: {
      create: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PeriodLockService,
          useValue: mockPeriodLockService,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    jest.clearAllMocks();
  });

  describe('Criação de Venda', () => {
    it('Caso A: Venda simples - stock=100, cost=4, price=8, qty=10 -> receita=80, CMV=40, lucro bruto=40, newStock=90', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Cerveja',
        type: ItemType.PRODUCT_STOCK,
        unitOfMeasure: UnitOfMeasure.UNIT,
        isActive: true,
        currentPrice: new Prisma.Decimal(8),
        averageCost: new Prisma.Decimal(4),
        currentStock: new Prisma.Decimal(100),
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      let capturedSale: any = null;
      let capturedSaleItem: any = null;
      let capturedStockMovement: any = null;
      let capturedProductUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
            update: jest.fn().mockImplementation(({ data }) => {
              capturedProductUpdate = data;
              return { ...mockProduct, ...data };
            }),
          },
          sale: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedSale = { id: 'sale-1', ...data };
              return capturedSale;
            }),
            findUnique: jest.fn().mockImplementation(() =>
              Promise.resolve({
                ...capturedSale,
                items: [
                  {
                    ...capturedSaleItem,
                    product: mockProduct,
                  },
                ],
              }),
            ),
          },
          saleItem: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedSaleItem = { id: 'si-1', ...data };
              return capturedSaleItem;
            }),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedStockMovement = { id: 'sm-1', ...data };
              return capturedStockMovement;
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.create({
        items: [{ productId: 'prod-1', quantity: 10 }],
      });

      expect(result.subtotal).toBe('80.00');
      expect(result.discount).toBe('0.00');
      expect(result.totalAmount).toBe('80.00');
      expect(result.totalCMV).toBe('40.00');
      expect(result.grossProfit).toBe('40.00');

      expect(capturedProductUpdate.currentStock.toString()).toBe('90');
      expect(capturedStockMovement.type).toBe(StockMovementType.SALE);
      expect(capturedStockMovement.quantity.toString()).toBe('-10');
      expect(capturedStockMovement.unitCost.toString()).toBe('4');
      expect(capturedStockMovement.totalCost.toString()).toBe('40');
      expect(capturedStockMovement.balanceAfter.toString()).toBe('90');
      expect(capturedStockMovement.stockValueAfter.toString()).toBe('360');
    });

    it('Caso B: Venda com desconto - 10 un x R$ 8 = 80, discount = 10 -> totalAmount = 70, CMV = 40, lucro bruto = 30', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Cerveja',
        type: ItemType.PRODUCT_STOCK,
        unitOfMeasure: UnitOfMeasure.UNIT,
        isActive: true,
        currentPrice: new Prisma.Decimal(8),
        averageCost: new Prisma.Decimal(4),
        currentStock: new Prisma.Decimal(100),
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      let capturedSale: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
            update: jest.fn().mockResolvedValue(mockProduct),
          },
          sale: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedSale = { id: 'sale-2', ...data };
              return capturedSale;
            }),
            findUnique: jest.fn().mockImplementation(() =>
              Promise.resolve({
                ...capturedSale,
                items: [
                  {
                    id: 'si-1',
                    saleId: 'sale-2',
                    productId: 'prod-1',
                    quantity: new Prisma.Decimal(10),
                    unitPrice: new Prisma.Decimal(8),
                    subtotal: new Prisma.Decimal(80),
                    unitCost: new Prisma.Decimal(4),
                    totalCost: new Prisma.Decimal(40),
                    product: mockProduct,
                  },
                ],
              }),
            ),
          },
          saleItem: { create: jest.fn().mockResolvedValue({ id: 'si-1' }) },
          stockMovement: { create: jest.fn().mockResolvedValue({ id: 'sm-1' }) },
        };
        return callback(tx);
      });

      const result = await service.create({
        discount: 10,
        items: [{ productId: 'prod-1', quantity: 10 }],
      });

      expect(result.subtotal).toBe('80.00');
      expect(result.discount).toBe('10.00');
      expect(result.totalAmount).toBe('70.00');
      expect(result.totalCMV).toBe('40.00');
      expect(result.grossProfit).toBe('30.00'); // 70 - 40 = 30 (Desconto reduz receita, mas não reduz CMV)
    });

    it('Caso C: Venda com múltiplos produtos - calcula individualmente e consolida totais', async () => {
      const prodA = {
        id: 'prod-a',
        name: 'Refrigerante',
        type: ItemType.PRODUCT_STOCK,
        unitOfMeasure: UnitOfMeasure.UNIT,
        isActive: true,
        currentPrice: new Prisma.Decimal(6),
        averageCost: new Prisma.Decimal(3),
        currentStock: new Prisma.Decimal(20),
      };

      const prodB = {
        id: 'prod-b',
        name: 'Pastel',
        type: ItemType.PRODUCT_STOCK,
        unitOfMeasure: UnitOfMeasure.UNIT,
        isActive: true,
        currentPrice: new Prisma.Decimal(10),
        averageCost: new Prisma.Decimal(5),
        currentStock: new Prisma.Decimal(15),
      };

      mockPrismaService.product.findMany.mockResolvedValue([prodA, prodB]);

      let capturedSale: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findMany: jest.fn().mockResolvedValue([prodA, prodB]),
            update: jest.fn().mockResolvedValue({}),
          },
          sale: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedSale = { id: 'sale-3', ...data };
              return capturedSale;
            }),
            findUnique: jest.fn().mockImplementation(() =>
              Promise.resolve({
                ...capturedSale,
                items: [
                  {
                    id: 'si-a',
                    productId: 'prod-a',
                    quantity: new Prisma.Decimal(2),
                    unitPrice: new Prisma.Decimal(6),
                    subtotal: new Prisma.Decimal(12),
                    unitCost: new Prisma.Decimal(3),
                    totalCost: new Prisma.Decimal(6),
                    product: prodA,
                  },
                  {
                    id: 'si-b',
                    productId: 'prod-b',
                    quantity: new Prisma.Decimal(3),
                    unitPrice: new Prisma.Decimal(10),
                    subtotal: new Prisma.Decimal(30),
                    unitCost: new Prisma.Decimal(5),
                    totalCost: new Prisma.Decimal(15),
                    product: prodB,
                  },
                ],
              }),
            ),
          },
          saleItem: { create: jest.fn().mockResolvedValue({}) },
          stockMovement: { create: jest.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      const result = await service.create({
        items: [
          { productId: 'prod-a', quantity: 2 },
          { productId: 'prod-b', quantity: 3 },
        ],
      });

      // Total A: 2 * 6 = 12, Total B: 3 * 10 = 30 -> Subtotal = 42.00
      // CMV A: 2 * 3 = 6, CMV B: 3 * 5 = 15 -> CMV Total = 21.00
      // Lucro Bruto: 42 - 21 = 21.00
      expect(result.subtotal).toBe('42.00');
      expect(result.totalAmount).toBe('42.00');
      expect(result.totalCMV).toBe('21.00');
      expect(result.grossProfit).toBe('21.00');
      expect(result.items).toHaveLength(2);
    });

    it('Caso D: Serviço - venda de 1 entrada a R$ 30 -> receita = 30, CMV = 0, sem StockMovement', async () => {
      const mockService = {
        id: 'serv-1',
        name: 'Entrada de Show',
        type: ItemType.SERVICE,
        unitOfMeasure: UnitOfMeasure.UNIT,
        isActive: true,
        currentPrice: new Prisma.Decimal(30),
        averageCost: new Prisma.Decimal(0),
        currentStock: new Prisma.Decimal(0),
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockService]);

      let stockMovementCreated = false;
      let productUpdated = false;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findMany: jest.fn().mockResolvedValue([mockService]),
            update: jest.fn().mockImplementation(() => {
              productUpdated = true;
            }),
          },
          sale: {
            create: jest.fn().mockResolvedValue({ id: 'sale-4', subtotal: new Prisma.Decimal(30), discount: new Prisma.Decimal(0), totalAmount: new Prisma.Decimal(30) }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'sale-4',
              subtotal: new Prisma.Decimal(30),
              discount: new Prisma.Decimal(0),
              totalAmount: new Prisma.Decimal(30),
              items: [
                {
                  id: 'si-serv',
                  productId: 'serv-1',
                  quantity: new Prisma.Decimal(1),
                  unitPrice: new Prisma.Decimal(30),
                  subtotal: new Prisma.Decimal(30),
                  unitCost: new Prisma.Decimal(0),
                  totalCost: new Prisma.Decimal(0),
                  product: mockService,
                },
              ],
            }),
          },
          saleItem: { create: jest.fn().mockResolvedValue({}) },
          stockMovement: {
            create: jest.fn().mockImplementation(() => {
              stockMovementCreated = true;
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.create({
        items: [{ productId: 'serv-1', quantity: 1 }],
      });

      expect(result.subtotal).toBe('30.00');
      expect(result.totalAmount).toBe('30.00');
      expect(result.totalCMV).toBe('0.00');
      expect(result.grossProfit).toBe('30.00');
      expect(stockMovementCreated).toBe(false);
      expect(productUpdated).toBe(false);
    });

    it('Caso E: Estoque insuficiente - stock = 5, venda = 6 -> deve rejeitar com BadRequestException e abortar', async () => {
      const mockProduct = {
        id: 'prod-low',
        name: 'Água',
        type: ItemType.PRODUCT_STOCK,
        unitOfMeasure: UnitOfMeasure.UNIT,
        isActive: true,
        currentPrice: new Prisma.Decimal(4),
        averageCost: new Prisma.Decimal(2),
        currentStock: new Prisma.Decimal(5),
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
          },
        };
        return callback(tx);
      });

      await expect(
        service.create({
          items: [{ productId: 'prod-low', quantity: 6 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita desconto maior que o subtotal', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Item',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentPrice: new Prisma.Decimal(50),
        averageCost: new Prisma.Decimal(20),
        currentStock: new Prisma.Decimal(10),
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
          },
        };
        return callback(tx);
      });

      await expect(
        service.create({
          discount: 60, // Subtotal é 50
          items: [{ productId: 'prod-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Cancelamento de Venda', () => {
    it('Caso G: Cancelamento de venda - devolve mercadoria com SALE_RETURN e restaura estoque', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Cerveja',
        type: ItemType.PRODUCT_STOCK,
        currentStock: new Prisma.Decimal(90),
        averageCost: new Prisma.Decimal(4),
      };

      const mockSale = {
        id: 'sale-cancel-1',
        status: SaleStatus.COMPLETED,
        subtotal: new Prisma.Decimal(80),
        discount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(80),
        items: [
          {
            id: 'si-1',
            productId: 'prod-1',
            quantity: new Prisma.Decimal(10),
            unitPrice: new Prisma.Decimal(8),
            subtotal: new Prisma.Decimal(80),
            unitCost: new Prisma.Decimal(4),
            totalCost: new Prisma.Decimal(40),
            product: mockProduct,
          },
        ],
      };

      let capturedMovement: any = null;
      let capturedProductUpdate: any = null;
      let capturedSaleUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          sale: {
            findUnique: jest.fn().mockImplementation(() =>
              Promise.resolve(
                capturedSaleUpdate
                  ? { ...mockSale, ...capturedSaleUpdate }
                  : mockSale,
              ),
            ),
            update: jest.fn().mockImplementation(({ data }) => {
              capturedSaleUpdate = data;
              return { ...mockSale, ...data };
            }),
          },
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
            update: jest.fn().mockImplementation(({ data }) => {
              capturedProductUpdate = data;
              return { ...mockProduct, ...data };
            }),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedMovement = data;
              return { id: 'sm-return-1', ...data };
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.cancel('sale-cancel-1', {
        reason: 'Cliente desistiu do pedido',
      });

      expect(result.status).toBe(SaleStatus.CANCELED);
      expect(capturedSaleUpdate.status).toBe(SaleStatus.CANCELED);
      expect(capturedSaleUpdate.cancellationReason).toBe('Cliente desistiu do pedido');

      expect(capturedProductUpdate.currentStock.toString()).toBe('100'); // 90 + 10 = 100
      expect(capturedMovement.type).toBe(StockMovementType.SALE_RETURN);
      expect(capturedMovement.quantity.toString()).toBe('10'); // Positivo para estorno
      expect(capturedMovement.unitCost.toString()).toBe('4');
      expect(capturedMovement.totalCost.toString()).toBe('40');
      expect(capturedMovement.balanceAfter.toString()).toBe('100');
    });

    it('Caso H: Cancelamento duplicado deve ser rejeitado', async () => {
      const mockCanceledSale = {
        id: 'sale-already-canceled',
        status: SaleStatus.CANCELED,
        items: [],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          sale: {
            findUnique: jest.fn().mockResolvedValue(mockCanceledSale),
          },
        };
        return callback(tx);
      });

      await expect(
        service.cancel('sale-already-canceled', {
          reason: 'Tentando cancelar novamente',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Rejeita cancelamento de venda inexistente com 404', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          sale: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        service.cancel('non-existent-id', {
          reason: 'Motivo',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Period Lock Enforcement', () => {
    it('Bloqueia criação de venda com HTTP 422 se o mês estiver fechado', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Cerveja',
        type: ItemType.PRODUCT_STOCK,
        unitOfMeasure: UnitOfMeasure.UNIT,
        isActive: true,
        currentPrice: new Prisma.Decimal(8),
        averageCost: new Prisma.Decimal(4),
        currentStock: new Prisma.Decimal(100),
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPeriodLockService.lockAndAssertPeriodOpen.mockRejectedValueOnce(
        new UnprocessableEntityException('Período 2026-09 está fechado. Reabra o mês antes de realizar alterações.'),
      );

      await expect(
        service.create({
          saleDate: '2026-09-15T10:00:00.000Z',
          items: [{ productId: 'prod-1', quantity: 2 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('Bloqueia cancelamento de venda com HTTP 422 se o período da venda estiver fechado', async () => {
      const mockSale = {
        id: 'sale-locked',
        saleDate: new Date('2026-09-10T12:00:00.000Z'),
        status: SaleStatus.COMPLETED,
        items: [],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          sale: {
            findUnique: jest.fn().mockResolvedValue(mockSale),
          },
        };
        return callback(tx);
      });

      mockPeriodLockService.lockAndAssertAllPeriodsOpen.mockRejectedValueOnce(
        new UnprocessableEntityException('Período 2026-09 está fechado. Reabra o mês antes de realizar alterações.'),
      );

      await expect(
        service.cancel('sale-locked', {
          reason: 'Cancelamento em mês fechado',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
