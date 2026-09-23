import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemType, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpeningBalanceDto } from './dto/opening-balance.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async setOpeningBalance(dto: OpeningBalanceDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Produto com ID "${dto.productId}" não foi encontrado.`);
    }

    if (product.type === ItemType.SERVICE) {
      throw new BadRequestException(
        `Itens do tipo SERVICE não controlam estoque físico e não podem receber saldo inicial.`,
      );
    }

    // Run inside transaction with row-locking
    return this.prisma.$transaction(async (tx) => {
      // Row locking to avoid concurrency race
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${dto.productId} FOR UPDATE`;

      const existingMovementsCount = await tx.stockMovement.count({
        where: { productId: dto.productId },
      });

      if (existingMovementsCount > 0) {
        throw new ConflictException(
          `Este produto já possui movimentações de estoque registradas. O saldo inicial só pode ser aplicado uma única vez para implantação. Utilize ajustes de estoque caso necessite corrigir.`,
        );
      }

      const quantity = new Prisma.Decimal(dto.quantity);
      const unitCost = new Prisma.Decimal(dto.unitCost);
      const totalCost = quantity.mul(unitCost).toDecimalPlaces(2);
      const balanceAfter = quantity;
      const averageCostAfter = unitCost;
      const stockValueAfter = totalCost;

      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          type: StockMovementType.INITIAL_BALANCE,
          quantity,
          unitCost,
          totalCost,
          averageCostAfter,
          balanceAfter,
          stockValueAfter,
          reason: 'Saldo inicial de implantação',
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: dto.productId },
        data: {
          currentStock: balanceAfter,
          averageCost: averageCostAfter,
        },
        include: {
          category: true,
        },
      });

      return {
        product: updatedProduct,
        movement,
      };
    });
  }

  async getInventoryOverview() {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    return products.map((product) => this.calculateProductInventoryMetrics(product));
  }

  async getProductInventory(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Produto com ID "${productId}" não foi encontrado.`);
    }

    return this.calculateProductInventoryMetrics(product);
  }

  async getProductMovements(productId: string) {
    await this.getProductInventory(productId);

    return this.prisma.stockMovement.findMany({
      where: { productId },
      orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        purchaseItem: {
          include: {
            purchase: {
              include: {
                supplier: true,
              },
            },
          },
        },
        saleItem: {
          include: {
            sale: true,
          },
        },
      },
    });
  }

  private calculateProductInventoryMetrics(product: any) {
    if (product.type === ItemType.SERVICE) {
      return {
        ...product,
        currentStock: '0.000',
        averageCost: '0.0000',
        stockValue: '0.00',
        potentialRevenue: '0.00',
        potentialGrossProfit: '0.00',
      };
    }

    const currentStock = new Prisma.Decimal(product.currentStock);
    const averageCost = new Prisma.Decimal(product.averageCost);
    const currentPrice = new Prisma.Decimal(product.currentPrice);

    const stockValue = currentStock.mul(averageCost).toDecimalPlaces(2);
    const potentialRevenue = currentStock.mul(currentPrice).toDecimalPlaces(2);
    const potentialGrossProfit = potentialRevenue.sub(stockValue).toDecimalPlaces(2);

    return {
      ...product,
      currentStock: currentStock.toFixed(3),
      averageCost: averageCost.toFixed(4),
      currentPrice: currentPrice.toFixed(2),
      stockValue: stockValue.toFixed(2),
      potentialRevenue: potentialRevenue.toFixed(2),
      potentialGrossProfit: potentialGrossProfit.toFixed(2),
    };
  }
}
