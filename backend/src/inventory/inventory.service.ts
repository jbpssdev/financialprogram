import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemType, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AllowedAdjustmentType, CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
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

  async createAdjustment(dto: CreateStockAdjustmentDto) {
    if (dto.quantity <= 0) {
      throw new BadRequestException('A quantidade do ajuste deve ser estritamente maior que zero.');
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('O motivo do ajuste é obrigatório.');
    }

    const allowedTypes = Object.values(AllowedAdjustmentType);

    if (!allowedTypes.includes(dto.type)) {
      throw new BadRequestException(
        `Tipo de ajuste inválido. Tipos permitidos: ADJUSTMENT_POSITIVE, ADJUSTMENT_NEGATIVE, LOSS, INTERNAL_CONSUMPTION.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Row locking to prevent race conditions with sales, purchases, or concurrent adjustments
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${dto.productId} FOR UPDATE`;

      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        include: { category: true },
      });

      if (!product) {
        throw new NotFoundException(`Produto com ID "${dto.productId}" não foi encontrado.`);
      }

      if (product.type === ItemType.SERVICE) {
        throw new BadRequestException(
          `Itens do tipo SERVICE não controlam estoque físico e não podem receber ajustes de estoque.`,
        );
      }

      if (!product.isActive) {
        throw new BadRequestException(`O produto "${product.name}" está inativo.`);
      }

      const currentStock = new Prisma.Decimal(product.currentStock);
      const averageCost = new Prisma.Decimal(product.averageCost);
      const qtyInput = new Prisma.Decimal(dto.quantity);

      let movementQty: Prisma.Decimal;
      let newStock: Prisma.Decimal;

      if (dto.type === AllowedAdjustmentType.ADJUSTMENT_POSITIVE) {
        movementQty = qtyInput;
        newStock = currentStock.add(movementQty);
      } else {
        // ADJUSTMENT_NEGATIVE, LOSS, INTERNAL_CONSUMPTION
        if (qtyInput.gt(currentStock)) {
          throw new BadRequestException(
            `Estoque insuficiente para a operação. Saldo atual: ${currentStock.toFixed(3)}, Quantidade solicitada: ${qtyInput.toFixed(3)}.`,
          );
        }
        movementQty = qtyInput.negated();
        newStock = currentStock.sub(qtyInput);
      }

      // Unit cost is the current weighted average cost (CMP remains unchanged)
      const unitCost = averageCost;
      const totalCost = qtyInput.mul(unitCost).toDecimalPlaces(2);
      const balanceAfter = newStock;
      const averageCostAfter = averageCost;
      const stockValueAfter = balanceAfter.mul(averageCostAfter).toDecimalPlaces(2);

      const reasonFormatted = dto.notes?.trim()
        ? `${dto.reason.trim()} - Obs: ${dto.notes.trim()}`
        : dto.reason.trim();

      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          type: dto.type as unknown as StockMovementType,
          quantity: movementQty,
          unitCost,
          totalCost,
          averageCostAfter,
          balanceAfter,
          stockValueAfter,
          reason: reasonFormatted,
          movementDate: new Date(),
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: dto.productId },
        data: {
          currentStock: balanceAfter,
        },
        include: {
          category: true,
        },
      });

      return {
        product: this.calculateProductInventoryMetrics(updatedProduct),
        movement: {
          id: movement.id,
          productId: movement.productId,
          type: movement.type,
          quantity: movement.quantity.toFixed(3),
          unitCost: movement.unitCost.toFixed(4),
          totalCost: movement.totalCost.toFixed(2),
          averageCostAfter: movement.averageCostAfter.toFixed(4),
          balanceAfter: movement.balanceAfter.toFixed(3),
          stockValueAfter: movement.stockValueAfter.toFixed(2),
          reason: movement.reason,
          movementDate: movement.movementDate,
          createdAt: movement.createdAt,
        },
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
