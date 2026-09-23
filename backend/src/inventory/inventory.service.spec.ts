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
});
