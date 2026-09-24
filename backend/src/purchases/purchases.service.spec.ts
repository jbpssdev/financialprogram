import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemType, PaymentMethod, Prisma, PurchasePaymentStatus, PurchaseStatus } from '@prisma/client';
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
      update: jest.fn(),
    },
    purchasePayment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

  describe('Pagamentos de Compras e Cancelamento/Estorno Auditável', () => {
    // A & B: Novo pagamento inicia CONFIRMED e atualiza paidAmount/status
    it('A & B. should register new payment as CONFIRMED, update paidAmount to 400, remaining to 600, status to PARTIALLY_PAID', async () => {
      const mockPurchase = {
        id: 'purch-1000',
        totalAmount: new Prisma.Decimal(1000),
        paidAmount: new Prisma.Decimal(0),
        status: PurchaseStatus.PENDING,
      };

      let capturedPaymentCreate: any = null;
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
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockImplementation(({ data }) => {
              capturedPaymentCreate = data;
              return { id: 'pay-1', ...data };
            }),
          },
        };
        return callback(tx);
      });

      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...mockPurchase,
        paidAmount: new Prisma.Decimal(400),
        status: PurchaseStatus.PARTIALLY_PAID,
        items: [],
        payments: [{ id: 'pay-1', amount: new Prisma.Decimal(400), status: PurchasePaymentStatus.CONFIRMED }],
      });

      const result = await service.addPayment('purch-1000', {
        amount: 400,
        paymentMethod: PaymentMethod.PIX,
      });

      // A: status starts CONFIRMED
      expect(capturedPaymentCreate.status).toBe(PurchasePaymentStatus.CONFIRMED);
      expect(capturedPaymentCreate.amount.toString()).toBe('400');

      // B: paidAmount 400, remaining 600, PARTIALLY_PAID
      expect(capturedPurchaseUpdate.paidAmount.toString()).toBe('400');
      expect(capturedPurchaseUpdate.status).toBe(PurchaseStatus.PARTIALLY_PAID);
      expect(result.paidAmount).toBe('400.00');
      expect(result.remainingAmount).toBe('600.00');
      expect(result.status).toBe(PurchaseStatus.PARTIALLY_PAID);
    });

    it('E_old. tentativa de pagamento acima do saldo devedor deve ser bloqueada', async () => {
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
          purchasePayment: {
            findMany: jest.fn().mockResolvedValue([{ amount: new Prisma.Decimal(800), status: PurchasePaymentStatus.CONFIRMED }]),
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

    // C & E: Cancelar pagamento de 400 (único pagamento) -> payment CANCELED, paidAmount 0, remaining 1000, status PENDING
    it('C & E. should cancel payment of 400, setting paidAmount to 0, remaining to 1000, and status to PENDING', async () => {
      const mockPurchase = {
        id: 'purch-1000',
        totalAmount: new Prisma.Decimal(1000),
        paidAmount: new Prisma.Decimal(400),
        status: PurchaseStatus.PARTIALLY_PAID,
      };

      const mockPayment = {
        id: 'pay-400',
        purchaseId: 'purch-1000',
        amount: new Prisma.Decimal(400),
        status: PurchasePaymentStatus.CONFIRMED,
      };

      let capturedPaymentUpdate: any = null;
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
            findUnique: jest.fn().mockResolvedValue(mockPayment),
            update: jest.fn().mockImplementation(({ data }) => {
              capturedPaymentUpdate = data;
              return { ...mockPayment, ...data };
            }),
            findMany: jest.fn().mockResolvedValue([]), // No active confirmed payments remaining
          },
        };
        return callback(tx);
      });

      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...mockPurchase,
        paidAmount: new Prisma.Decimal(0),
        status: PurchaseStatus.PENDING,
        items: [],
        payments: [{ ...mockPayment, status: PurchasePaymentStatus.CANCELED }],
      });

      const result = await service.cancelPayment('purch-1000', 'pay-400', {
        reason: 'Lançado indevidamente',
      });

      expect(capturedPaymentUpdate.status).toBe(PurchasePaymentStatus.CANCELED);
      expect(capturedPaymentUpdate.cancellationReason).toBe('Lançado indevidamente');
      expect(capturedPaymentUpdate.canceledAt).toBeDefined();

      expect(capturedPurchaseUpdate.paidAmount.toString()).toBe('0');
      expect(capturedPurchaseUpdate.status).toBe(PurchaseStatus.PENDING);
      expect(result.paidAmount).toBe('0.00');
      expect(result.remainingAmount).toBe('1000.00');
      expect(result.status).toBe(PurchaseStatus.PENDING);
    });

    // D: Dois pagamentos 400 + 600 (PAID), cancelar o de 600 -> paidAmount 400, remaining 600, PARTIALLY_PAID
    it('D. should cancel 600 payment from a fully PAID purchase (400 + 600), reverting status to PARTIALLY_PAID and paidAmount to 400', async () => {
      const mockPurchase = {
        id: 'purch-1000',
        totalAmount: new Prisma.Decimal(1000),
        paidAmount: new Prisma.Decimal(1000),
        status: PurchaseStatus.PAID,
      };

      const mockPayment600 = {
        id: 'pay-600',
        purchaseId: 'purch-1000',
        amount: new Prisma.Decimal(600),
        status: PurchasePaymentStatus.CONFIRMED,
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
            findUnique: jest.fn().mockResolvedValue(mockPayment600),
            update: jest.fn().mockResolvedValue({ ...mockPayment600, status: PurchasePaymentStatus.CANCELED }),
            findMany: jest.fn().mockResolvedValue([
              { id: 'pay-400', amount: new Prisma.Decimal(400), status: PurchasePaymentStatus.CONFIRMED },
            ]),
          },
        };
        return callback(tx);
      });

      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...mockPurchase,
        paidAmount: new Prisma.Decimal(400),
        status: PurchaseStatus.PARTIALLY_PAID,
        items: [],
        payments: [
          { id: 'pay-400', amount: new Prisma.Decimal(400), status: PurchasePaymentStatus.CONFIRMED },
          { id: 'pay-600', amount: new Prisma.Decimal(600), status: PurchasePaymentStatus.CANCELED },
        ],
      });

      const result = await service.cancelPayment('purch-1000', 'pay-600', {
        reason: 'Cheque devolvido',
      });

      expect(capturedPurchaseUpdate.paidAmount.toString()).toBe('400');
      expect(capturedPurchaseUpdate.status).toBe(PurchaseStatus.PARTIALLY_PAID);
      expect(result.paidAmount).toBe('400.00');
      expect(result.remainingAmount).toBe('600.00');
      expect(result.status).toBe(PurchaseStatus.PARTIALLY_PAID);
    });

    // F: Duplo cancelamento -> rejeitar
    it('F. should reject double cancellation on an already CANCELED payment', async () => {
      const mockPurchase = { id: 'purch-1000', totalAmount: new Prisma.Decimal(1000) };
      const alreadyCanceledPayment = {
        id: 'pay-1',
        purchaseId: 'purch-1000',
        amount: new Prisma.Decimal(400),
        status: PurchasePaymentStatus.CANCELED,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          purchase: { findUnique: jest.fn().mockResolvedValue(mockPurchase) },
          purchasePayment: { findUnique: jest.fn().mockResolvedValue(alreadyCanceledPayment) },
        };
        return callback(tx);
      });

      await expect(
        service.cancelPayment('purch-1000', 'pay-1', { reason: 'Tentativa 2' }),
      ).rejects.toThrow(BadRequestException);
    });

    // G: Payment pertencente a outra Purchase -> rejeitar
    it('G. should reject cancellation if payment belongs to a different purchase', async () => {
      const mockPurchase = { id: 'purch-1000', totalAmount: new Prisma.Decimal(1000) };
      const paymentOtherPurchase = {
        id: 'pay-other',
        purchaseId: 'purch-9999', // Different purchase
        amount: new Prisma.Decimal(400),
        status: PurchasePaymentStatus.CONFIRMED,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          purchase: { findUnique: jest.fn().mockResolvedValue(mockPurchase) },
          purchasePayment: { findUnique: jest.fn().mockResolvedValue(paymentOtherPurchase) },
        };
        return callback(tx);
      });

      await expect(
        service.cancelPayment('purch-1000', 'pay-other', { reason: 'Estorno' }),
      ).rejects.toThrow(BadRequestException);
    });

    // H: Histórico mantém pagamento cancelado na consulta de detalhes
    it('H. should preserve canceled payments in purchase details history', async () => {
      const mockPurchaseWithPayments = {
        id: 'purch-1000',
        totalAmount: new Prisma.Decimal(1000),
        paidAmount: new Prisma.Decimal(400),
        status: PurchaseStatus.PARTIALLY_PAID,
        items: [],
        payments: [
          {
            id: 'pay-1',
            amount: new Prisma.Decimal(400),
            paymentDate: new Date(),
            paymentMethod: PaymentMethod.PIX,
            status: PurchasePaymentStatus.CONFIRMED,
          },
          {
            id: 'pay-2',
            amount: new Prisma.Decimal(600),
            paymentDate: new Date(),
            paymentMethod: PaymentMethod.CASH,
            status: PurchasePaymentStatus.CANCELED,
            canceledAt: new Date(),
            cancellationReason: 'Estornado pelo fornecedor',
          },
        ],
      };

      mockPrismaService.purchase.findUnique.mockResolvedValue(mockPurchaseWithPayments);

      const result = await service.findOne('purch-1000');

      expect(result.payments).toHaveLength(2);
      expect(result.payments[0].status).toBe(PurchasePaymentStatus.CONFIRMED);
      expect(result.payments[1].status).toBe(PurchasePaymentStatus.CANCELED);
      expect(result.payments[1].cancellationReason).toBe('Estornado pelo fornecedor');
      expect(result.paidAmount).toBe('400.00'); // Sums only CONFIRMED
      expect(result.remainingAmount).toBe('600.00');
    });

    // J: Concorrência e bloqueio determinístico
    it('J. should execute deterministic row locking for both purchase and purchasePayment', async () => {
      const mockPurchase = { id: 'purch-1000', totalAmount: new Prisma.Decimal(1000), paidAmount: new Prisma.Decimal(500) };
      const mockPayment = { id: 'pay-1', purchaseId: 'purch-1000', amount: new Prisma.Decimal(500), status: PurchasePaymentStatus.CONFIRMED };

      const queryRawMock = jest.fn().mockResolvedValue([]);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: queryRawMock,
          purchase: {
            findUnique: jest.fn().mockResolvedValue(mockPurchase),
            update: jest.fn().mockResolvedValue(mockPurchase),
          },
          purchasePayment: {
            findUnique: jest.fn().mockResolvedValue(mockPayment),
            update: jest.fn().mockResolvedValue({ ...mockPayment, status: PurchasePaymentStatus.CANCELED }),
            findMany: jest.fn().mockResolvedValue([]),
          },
        };
        return callback(tx);
      });

      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...mockPurchase,
        items: [],
        payments: [],
      });

      await service.cancelPayment('purch-1000', 'pay-1', { reason: 'Teste lock' });

      // Check row lock was called for purchase and payment
      expect(queryRawMock).toHaveBeenCalledTimes(2);
    });
  });
});
