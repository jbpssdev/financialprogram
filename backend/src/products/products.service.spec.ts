import { Test, TestingModule } from '@nestjs/testing';
import { ItemType, Prisma, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    priceHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('Alteração de Preço e Histórico', () => {
    it('Caso G: alteração de currentPrice de R$ 8,00 para R$ 9,50 deve registrar PriceHistory com oldPrice, newPrice e averageCost', async () => {
      const mockProduct = {
        id: 'prod-10',
        categoryId: 'cat-1',
        name: 'Cerveja Artesanal',
        type: ItemType.PRODUCT_STOCK,
        unitOfMeasure: UnitOfMeasure.UNIT,
        currentPrice: new Prisma.Decimal(8.0),
        averageCost: new Prisma.Decimal(4.2),
        currentStock: new Prisma.Decimal(50),
        isActive: true,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      let capturedPriceHistory: any = null;
      let capturedProductUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          priceHistory: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedPriceHistory = data;
              return { id: 'ph-1', ...data };
            }),
          },
          product: {
            update: jest.fn().mockImplementation(({ data }) => {
              capturedProductUpdate = data;
              return { ...mockProduct, currentPrice: data.currentPrice };
            }),
          },
        };
        return callback(tx);
      });

      await service.update('prod-10', {
        currentPrice: 9.5,
      });

      expect(capturedPriceHistory).toBeDefined();
      expect(capturedPriceHistory.productId).toBe('prod-10');
      expect(capturedPriceHistory.oldPrice.toString()).toBe('8');
      expect(capturedPriceHistory.newPrice.toString()).toBe('9.5');
      expect(capturedPriceHistory.averageCost.toString()).toBe('4.2');
      expect(capturedProductUpdate.currentPrice.toString()).toBe('9.5');
    });

    it('não deve gerar PriceHistory se o preço não for alterado no update', async () => {
      const mockProduct = {
        id: 'prod-10',
        categoryId: 'cat-1',
        name: 'Cerveja Artesanal',
        currentPrice: new Prisma.Decimal(8.0),
        averageCost: new Prisma.Decimal(4.2),
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProduct,
        description: 'Nova descrição',
      });

      await service.update('prod-10', {
        description: 'Nova descrição',
      });

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockPrismaService.product.update).toHaveBeenCalled();
    });
  });
});
