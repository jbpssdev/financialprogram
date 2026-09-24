import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemType, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  describe('setOpeningBalance', () => {
    it('Caso A: deve inicializar estoque com 200 unidades a R$ 4,00 resultando em currentStock = 200 e averageCost = 4.0000', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Cerveja Lata',
        type: ItemType.PRODUCT_STOCK,
        currentStock: new Prisma.Decimal(0),
        averageCost: new Prisma.Decimal(0),
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          stockMovement: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockImplementation(({ data }) => ({
              id: 'mov-1',
              ...data,
            })),
          },
          product: {
            update: jest.fn().mockImplementation(({ data }) => ({
              ...mockProduct,
              currentStock: data.currentStock,
              averageCost: data.averageCost,
            })),
          },
        };
        return callback(tx);
      });

      const result = await service.setOpeningBalance({
        productId: 'prod-1',
        quantity: 200,
        unitCost: 4.0,
      });

      expect(result.product.currentStock.toString()).toBe('200');
      expect(result.product.averageCost.toString()).toBe('4');
      expect(result.movement.type).toBe(StockMovementType.INITIAL_BALANCE);
      expect(result.movement.quantity.toString()).toBe('200');
      expect(result.movement.unitCost.toString()).toBe('4');
      expect(result.movement.totalCost.toString()).toBe('800');
      expect(result.movement.averageCostAfter.toString()).toBe('4');
      expect(result.movement.balanceAfter.toString()).toBe('200');
      expect(result.movement.stockValueAfter.toString()).toBe('800');
    });

    it('Caso F: deve bloquear recebimento de estoque inicial para item do tipo SERVICE', async () => {
      const mockServiceProduct = {
        id: 'service-1',
        name: 'Entrada Show',
        type: ItemType.SERVICE,
        currentStock: new Prisma.Decimal(0),
        averageCost: new Prisma.Decimal(0),
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockServiceProduct);

      await expect(
        service.setOpeningBalance({
          productId: 'service-1',
          quantity: 50,
          unitCost: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve bloquear saldo inicial se o produto já possuir movimentações prévias', async () => {
      const mockProduct = {
        id: 'prod-2',
        name: 'Lanche',
        type: ItemType.PRODUCT_STOCK,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          stockMovement: {
            count: jest.fn().mockResolvedValue(2), // Já possui 2 movimentos
          },
        };
        return callback(tx);
      });

      await expect(
        service.setOpeningBalance({
          productId: 'prod-2',
          quantity: 10,
          unitCost: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createAdjustment', () => {
    // A. ADJUSTMENT_POSITIVE: stock=10, avgCost=5, qty=2 -> stock=12, avgCost=5, movement quantity=+2, stockValueAfter=60
    it('A. should process ADJUSTMENT_POSITIVE increasing stock without changing averageCost', async () => {
      const mockProduct = {
        id: 'prod-10',
        name: 'Vodka',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentPrice: new Prisma.Decimal(50),
        currentStock: new Prisma.Decimal(10),
        averageCost: new Prisma.Decimal(5),
      };

      let capturedMovement: any = null;
      let capturedProductUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn().mockImplementation(({ data }) => {
              capturedProductUpdate = data;
              return { ...mockProduct, ...data };
            }),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedMovement = { id: 'mov-pos', ...data };
              return capturedMovement;
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.createAdjustment({
        productId: 'prod-10',
        type: 'ADJUSTMENT_POSITIVE' as any,
        quantity: 2,
        reason: 'Sobra de contagem física',
      });

      expect(capturedMovement.quantity.toString()).toBe('2');
      expect(capturedMovement.unitCost.toString()).toBe('5');
      expect(capturedMovement.totalCost.toString()).toBe('10');
      expect(capturedMovement.averageCostAfter.toString()).toBe('5');
      expect(capturedMovement.balanceAfter.toString()).toBe('12');
      expect(capturedMovement.stockValueAfter.toString()).toBe('60');

      expect(capturedProductUpdate.currentStock.toString()).toBe('12');
      expect(result.product.currentStock).toBe('12.000');
      expect(result.product.averageCost).toBe('5.0000');
      expect(result.movement.quantity).toBe('2.000');
      expect(result.movement.stockValueAfter).toBe('60.00');
    });

    // B. ADJUSTMENT_NEGATIVE: stock=10, qty=3 -> stock=7, movement quantity=-3
    it('B. should process ADJUSTMENT_NEGATIVE decreasing stock with negative movement quantity', async () => {
      const mockProduct = {
        id: 'prod-10',
        name: 'Vodka',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentPrice: new Prisma.Decimal(50),
        currentStock: new Prisma.Decimal(10),
        averageCost: new Prisma.Decimal(5),
      };

      let capturedMovement: any = null;
      let capturedProductUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn().mockImplementation(({ data }) => {
              capturedProductUpdate = data;
              return { ...mockProduct, ...data };
            }),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedMovement = { id: 'mov-neg', ...data };
              return capturedMovement;
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.createAdjustment({
        productId: 'prod-10',
        type: 'ADJUSTMENT_NEGATIVE' as any,
        quantity: 3,
        reason: 'Falta apurada em contagem',
      });

      expect(capturedMovement.quantity.toString()).toBe('-3');
      expect(capturedMovement.unitCost.toString()).toBe('5');
      expect(capturedMovement.totalCost.toString()).toBe('15');
      expect(capturedMovement.balanceAfter.toString()).toBe('7');
      expect(capturedProductUpdate.currentStock.toString()).toBe('7');
      expect(result.product.currentStock).toBe('7.000');
      expect(result.movement.quantity).toBe('-3.000');
    });

    // C. LOSS: stock=10, avgCost=4, loss=2 -> stock=8, unitCost=4, totalCost=8, avgCost remains 4
    it('C. should process LOSS decreasing stock with unitCost equal to current averageCost', async () => {
      const mockProduct = {
        id: 'prod-10',
        name: 'Cerveja',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentPrice: new Prisma.Decimal(10),
        currentStock: new Prisma.Decimal(10),
        averageCost: new Prisma.Decimal(4),
      };

      let capturedMovement: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn().mockImplementation(({ data }) => ({ ...mockProduct, ...data })),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedMovement = { id: 'mov-loss', ...data };
              return capturedMovement;
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.createAdjustment({
        productId: 'prod-10',
        type: 'LOSS' as any,
        quantity: 2,
        reason: 'Garrafas quebradas no estoque',
      });

      expect(capturedMovement.quantity.toString()).toBe('-2');
      expect(capturedMovement.unitCost.toString()).toBe('4');
      expect(capturedMovement.totalCost.toString()).toBe('8');
      expect(capturedMovement.averageCostAfter.toString()).toBe('4');
      expect(capturedMovement.balanceAfter.toString()).toBe('8');
      expect(result.product.currentStock).toBe('8.000');
      expect(result.product.averageCost).toBe('4.0000');
    });

    // D. INTERNAL_CONSUMPTION: stock=10, consumo=3 -> stock=7
    it('D. should process INTERNAL_CONSUMPTION decreasing stock by 3', async () => {
      const mockProduct = {
        id: 'prod-10',
        name: 'Energético',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentPrice: new Prisma.Decimal(15),
        currentStock: new Prisma.Decimal(10),
        averageCost: new Prisma.Decimal(6),
      };

      let capturedMovement: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn().mockImplementation(({ data }) => ({ ...mockProduct, ...data })),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedMovement = { id: 'mov-cons', ...data };
              return capturedMovement;
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.createAdjustment({
        productId: 'prod-10',
        type: 'INTERNAL_CONSUMPTION' as any,
        quantity: 3,
        reason: 'Consumo da equipe de atendimento',
      });

      expect(capturedMovement.quantity.toString()).toBe('-3');
      expect(capturedMovement.balanceAfter.toString()).toBe('7');
      expect(result.product.currentStock).toBe('7.000');
    });

    // E. Insufficient stock: stock=2, LOSS=3 -> reject
    it('E. should reject adjustment when quantity exceeds current stock for negative operations', async () => {
      const mockProduct = {
        id: 'prod-10',
        name: 'Energético',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentStock: new Prisma.Decimal(2),
        averageCost: new Prisma.Decimal(6),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn(),
          },
          stockMovement: {
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      await expect(
        service.createAdjustment({
          productId: 'prod-10',
          type: 'LOSS' as any,
          quantity: 3,
          reason: 'Perda',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // F. SERVICE: reject any adjustment
    it('F. should reject any inventory adjustment on SERVICE products', async () => {
      const mockServiceProduct = {
        id: 'srv-1',
        name: 'Couvert Artístico',
        type: ItemType.SERVICE,
        isActive: true,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findUnique: jest.fn().mockResolvedValue(mockServiceProduct),
          },
        };
        return callback(tx);
      });

      await expect(
        service.createAdjustment({
          productId: 'srv-1',
          type: 'ADJUSTMENT_POSITIVE' as any,
          quantity: 5,
          reason: 'Tentativa em serviço',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // G. TOKEN_QUANTITY: accept adjustment
    it('G. should accept adjustments on TOKEN_QUANTITY products', async () => {
      const mockTokenProduct = {
        id: 'token-1',
        name: 'Ficha Chopp',
        type: ItemType.TOKEN_QUANTITY,
        isActive: true,
        currentPrice: new Prisma.Decimal(10),
        currentStock: new Prisma.Decimal(50),
        averageCost: new Prisma.Decimal(2),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          product: {
            findUnique: jest.fn().mockResolvedValue(mockTokenProduct),
            update: jest.fn().mockImplementation(({ data }) => ({ ...mockTokenProduct, ...data })),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => ({ id: 'mov-tok', ...data })),
          },
        };
        return callback(tx);
      });

      const result = await service.createAdjustment({
        productId: 'token-1',
        type: 'ADJUSTMENT_POSITIVE' as any,
        quantity: 20,
        reason: 'Recarga de fichas plásticas',
      });

      expect(result.product.currentStock).toBe('70.000');
    });

    // H. Invalid type: PURCHASE or SALE -> reject
    it('H. should reject adjustment with invalid type like PURCHASE or SALE', async () => {
      await expect(
        service.createAdjustment({
          productId: 'prod-1',
          type: 'PURCHASE' as any,
          quantity: 5,
          reason: 'Tentativa inválida',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // I. Empty reason -> reject
    it('I. should reject adjustment with empty reason', async () => {
      await expect(
        service.createAdjustment({
          productId: 'prod-1',
          type: 'LOSS' as any,
          quantity: 2,
          reason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // J. History: getProductMovements preserves all movements with their signs
    it('J. should return movements history preserving movement types and signs', async () => {
      const mockMovements = [
        {
          id: 'mov-1',
          productId: 'prod-1',
          type: StockMovementType.ADJUSTMENT_POSITIVE,
          quantity: new Prisma.Decimal(10),
          unitCost: new Prisma.Decimal(5),
          balanceAfter: new Prisma.Decimal(10),
        },
        {
          id: 'mov-2',
          productId: 'prod-1',
          type: StockMovementType.LOSS,
          quantity: new Prisma.Decimal(-2),
          unitCost: new Prisma.Decimal(5),
          balanceAfter: new Prisma.Decimal(8),
        },
      ];

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Produto Teste',
        type: ItemType.PRODUCT_STOCK,
        currentStock: new Prisma.Decimal(8),
        averageCost: new Prisma.Decimal(5),
        currentPrice: new Prisma.Decimal(10),
      });

      mockPrismaService.stockMovement.findMany.mockResolvedValue(mockMovements);

      const movements = await service.getProductMovements('prod-1');

      expect(movements).toHaveLength(2);
      expect(movements[0].quantity.toString()).toBe('10');
      expect(movements[1].quantity.toString()).toBe('-2');
    });

    // K. Concurrency: row locking FOR UPDATE called
    it('K. should execute SELECT ... FOR UPDATE on product before calculating stock adjustment', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Item',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentStock: new Prisma.Decimal(10),
        averageCost: new Prisma.Decimal(5),
        currentPrice: new Prisma.Decimal(10),
      };

      const queryRawMock = jest.fn().mockResolvedValue([]);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: queryRawMock,
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn().mockResolvedValue(mockProduct),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({ id: 'mov-1', quantity: new Prisma.Decimal(1), unitCost: new Prisma.Decimal(5), totalCost: new Prisma.Decimal(5), averageCostAfter: new Prisma.Decimal(5), balanceAfter: new Prisma.Decimal(11), stockValueAfter: new Prisma.Decimal(55), reason: 'Ajuste' }),
          },
        };
        return callback(tx);
      });

      await service.createAdjustment({
        productId: 'prod-1',
        type: 'ADJUSTMENT_POSITIVE' as any,
        quantity: 1,
        reason: 'Teste lock',
      });

      expect(queryRawMock).toHaveBeenCalled();
    });
  });
});
