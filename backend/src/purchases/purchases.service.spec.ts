import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemType, PaymentMethod, Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PurchasesService } from './purchases.service';

describe('PurchasesService', () => {
  let service: PurchasesService;

  const mockPrismaService = {
    supplier: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    purchase: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
    jest.clearAllMocks();
  });

  describe('Cálculo de CMP (Custo Médio Ponderado Móvel) e Estoque', () => {
    it('Caso B: estoque atual 100 un x R$ 4,00 + nova compra 100 un x R$ 5,00 -> currentStock = 200, CMP = 4.5000, stockValue = R$ 900,00', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Cerveja',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentStock: new Prisma.Decimal(100),
        averageCost: new Prisma.Decimal(4.0),
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      let capturedProductUpdate: any = null;
      let capturedStockMovement: any = null;

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
          purchase: {
            create: jest.fn().mockResolvedValue({
              id: 'purch-1',
              totalAmount: new Prisma.Decimal(500),
              paidAmount: new Prisma.Decimal(0),
              status: PurchaseStatus.PENDING,
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'purch-1',
              totalAmount: new Prisma.Decimal(500),
              paidAmount: new Prisma.Decimal(0),
              status: PurchaseStatus.PENDING,
              items: [],
              payments: [],
            }),
          },
          purchaseItem: {
            create: jest.fn().mockResolvedValue({ id: 'pi-1' }),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedStockMovement = data;
              return { id: 'mov-1', ...data };
            }),
          },
        };
        return callback(tx);
      });

      await service.create({
        items: [
          {
            productId: 'prod-1',
            quantity: 100,
            unitCost: 5.0,
          },
        ],
      });

      expect(capturedProductUpdate.currentStock.toString()).toBe('200');
      expect(capturedProductUpdate.averageCost.toString()).toBe('4.5');
      expect(capturedStockMovement.averageCostAfter.toString()).toBe('4.5');
      expect(capturedStockMovement.balanceAfter.toString()).toBe('200');
      expect(capturedStockMovement.stockValueAfter.toString()).toBe('900');
    });

    it('Caso C: estoque atual 200 un x R$ 4,50 + nova compra 50 un x R$ 6,00 -> CMP = 4.8000', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Cerveja',
        type: ItemType.PRODUCT_STOCK,
        isActive: true,
        currentStock: new Prisma.Decimal(200),
        averageCost: new Prisma.Decimal(4.5),
      };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      let capturedProductUpdate: any = null;
      let capturedStockMovement: any = null;

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
          purchase: {
            create: jest.fn().mockResolvedValue({ id: 'purch-2' }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'purch-2',
              totalAmount: new Prisma.Decimal(300),
              paidAmount: new Prisma.Decimal(0),
              status: PurchaseStatus.PENDING,
              items: [],
              payments: [],
            }),
          },
          purchaseItem: {
            create: jest.fn().mockResolvedValue({ id: 'pi-2' }),
          },
          stockMovement: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedStockMovement = data;
              return { id: 'mov-2', ...data };
            }),
          },
        };
        return callback(tx);
      });

      await service.create({
        items: [
          {
            productId: 'prod-1',
            quantity: 50,
            unitCost: 6.0,
          },
        ],
      });

      // (200 * 4.50 + 50 * 6.00) / (200 + 50) = (900 + 300) / 250 = 1200 / 250 = 4.8000
      expect(capturedProductUpdate.currentStock.toString()).toBe('250');
      expect(capturedProductUpdate.averageCost.toString()).toBe('4.8');
      expect(capturedStockMovement.averageCostAfter.toString()).toBe('4.8');
      expect(capturedStockMovement.balanceAfter.toString()).toBe('250');
      expect(capturedStockMovement.stockValueAfter.toString()).toBe('1200');
    });
  });

  describe('Pagamentos de Compras', () => {
    it('Caso D: compra de R$ 1.000 com pagamento posterior de R$ 400 -> paidAmount = 400, status = PARTIALLY_PAID, saldo a pagar = 600', async () => {
      const mockPurchase = {
        id: 'purch-1000',
        totalAmount: new Prisma.Decimal(1000),
        paidAmount: new Prisma.Decimal(0),
        status: PurchaseStatus.PENDING,
      };

      let capturedPurchaseUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          purchase: {
            findUnique: jest.fn().mockImplementation(() =>
              Promise.resolve(
                capturedPurchaseUpdate
                  ? { ...mockPurchase, ...capturedPurchaseUpdate, items: [], payments: [] }
                  : mockPurchase,
              ),
            ),
            update: jest.fn().mockImplementation(({ data }) => {
              capturedPurchaseUpdate = data;
              return { ...mockPurchase, ...data };
            }),
          },
          purchasePayment: {
            create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
          },
        };
        return callback(tx);
      });

      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...mockPurchase,
        paidAmount: new Prisma.Decimal(400),
        status: PurchaseStatus.PARTIALLY_PAID,
        items: [],
        payments: [{ amount: new Prisma.Decimal(400) }],
      });

      const result = await service.addPayment('purch-1000', {
        amount: 400,
        paymentMethod: PaymentMethod.PIX,
      });

      expect(capturedPurchaseUpdate.paidAmount.toString()).toBe('400');
      expect(capturedPurchaseUpdate.status).toBe(PurchaseStatus.PARTIALLY_PAID);
      expect(result.paidAmount).toBe('400.00');
      expect(result.remainingAmount).toBe('600.00');
      expect(result.status).toBe(PurchaseStatus.PARTIALLY_PAID);
    });

    it('Caso E: tentativa de pagamento acima do saldo devedor deve ser bloqueada', async () => {
      const mockPurchase = {
        id: 'purch-1000',
        totalAmount: new Prisma.Decimal(1000),
        paidAmount: new Prisma.Decimal(800), // Restam 200
        status: PurchaseStatus.PARTIALLY_PAID,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          purchase: {
            findUnique: jest.fn().mockResolvedValue(mockPurchase),
          },
        };
        return callback(tx);
      });

      await expect(
        service.addPayment('purch-1000', {
          amount: 250, // Excede os 200 restantes
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
