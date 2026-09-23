import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemType, PaymentMethod, Prisma, SaleStatus, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSaleDto) {
    const uniqueProductIds = [...new Set(dto.items.map((i) => i.productId))].sort();

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException(`Um ou mais produtos informados na venda não foram encontrados.`);
    }

    for (const product of products) {
      if (!product.isActive) {
        throw new BadRequestException(`O produto "${product.name}" está inativo.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Deterministic row locking
      for (const pid of uniqueProductIds) {
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${pid} FOR UPDATE`;
      }

      // Re-fetch fresh locked records
      const lockedProducts = await tx.product.findMany({
        where: { id: { in: uniqueProductIds } },
      });
      const lockedMap = new Map(lockedProducts.map((p) => [p.id, p]));

      let subtotal = new Prisma.Decimal(0);
      let totalCMV = new Prisma.Decimal(0);

      const calculatedItems = dto.items.map((item) => {
        const product = lockedMap.get(item.productId)!;
        const itemQty = new Prisma.Decimal(item.quantity);
        const unitPrice = new Prisma.Decimal(product.currentPrice);
        const itemSubtotal = itemQty.mul(unitPrice).toDecimalPlaces(2);

        subtotal = subtotal.add(itemSubtotal);

        if (product.type === ItemType.SERVICE) {
          return {
            productId: item.productId,
            quantity: itemQty,
            unitPrice,
            subtotal: itemSubtotal,
            unitCost: new Prisma.Decimal(0),
            totalCost: new Prisma.Decimal(0),
            isService: true,
            newStock: new Prisma.Decimal(0),
            averageCostAfter: new Prisma.Decimal(0),
            stockValueAfter: new Prisma.Decimal(0),
          };
        }

        const currentStock = new Prisma.Decimal(product.currentStock);
        if (currentStock.lt(itemQty)) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto "${product.name}". Estoque atual: ${currentStock.toFixed(3)}, solicitado: ${itemQty.toFixed(3)}.`,
          );
        }

        const unitCost = new Prisma.Decimal(product.averageCost);
        const itemTotalCost = itemQty.mul(unitCost).toDecimalPlaces(2);
        totalCMV = totalCMV.add(itemTotalCost);

        const newStock = currentStock.sub(itemQty);
        const averageCostAfter = unitCost;
        const stockValueAfter = newStock.mul(averageCostAfter).toDecimalPlaces(2);

        // Update in-memory for potential duplicate product in same cart
        lockedMap.set(item.productId, {
          ...product,
          currentStock: newStock,
        } as any);

        return {
          productId: item.productId,
          quantity: itemQty,
          unitPrice,
          subtotal: itemSubtotal,
          unitCost,
          totalCost: itemTotalCost,
          isService: false,
          newStock,
          averageCostAfter,
          stockValueAfter,
        };
      });

      const discount = dto.discount !== undefined ? new Prisma.Decimal(dto.discount) : new Prisma.Decimal(0);
      if (discount.gt(subtotal)) {
        throw new BadRequestException(
          `O desconto (R$ ${discount.toFixed(2)}) não pode ser superior ao subtotal da venda (R$ ${subtotal.toFixed(2)}).`,
        );
      }

      const totalAmount = subtotal.sub(discount);
      const saleDate = dto.saleDate ? new Date(dto.saleDate) : new Date();

      // Create Sale header
      const sale = await tx.sale.create({
        data: {
          saleDate,
          status: SaleStatus.COMPLETED,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
          subtotal,
          discount,
          totalAmount,
          notes: dto.notes?.trim(),
        },
      });

      // Create SaleItems and StockMovements
      for (const item of calculatedItems) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          },
        });

        if (!item.isService) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              saleItemId: saleItem.id,
              type: StockMovementType.SALE,
              quantity: item.quantity.negated(),
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              averageCostAfter: item.averageCostAfter,
              balanceAfter: item.newStock,
              stockValueAfter: item.stockValueAfter,
              reason: 'Saída por venda',
              movementDate: saleDate,
            },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: item.newStock,
            },
          });
        }
      }

      const saleWithDetails = await this.findSaleWithDetails(sale.id, tx);
      return this.formatSaleSummary(saleWithDetails);
    });
  }

  async cancel(id: string, dto: CancelSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      // Row lock on sale
      await tx.$queryRaw`SELECT id FROM sales WHERE id = ${id} FOR UPDATE`;

      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!sale) {
        throw new NotFoundException(`Venda com ID "${id}" não foi encontrada.`);
      }

      if (sale.status === SaleStatus.CANCELED) {
        throw new BadRequestException(`Esta venda já está cancelada.`);
      }

      const stockItems = sale.items.filter((i) => i.product.type !== ItemType.SERVICE);
      const uniqueProductIds = [...new Set(stockItems.map((i) => i.productId))].sort();

      // Deterministic lock on involved products
      for (const pid of uniqueProductIds) {
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${pid} FOR UPDATE`;
      }

      const lockedProducts = await tx.product.findMany({
        where: { id: { in: uniqueProductIds } },
      });
      const lockedMap = new Map(lockedProducts.map((p) => [p.id, p]));

      const canceledDate = new Date();

      for (const item of stockItems) {
        const product = lockedMap.get(item.productId)!;
        const currentStock = new Prisma.Decimal(product.currentStock);
        const returnedQty = new Prisma.Decimal(item.quantity);
        const newStock = currentStock.add(returnedQty);

        // Average cost is preserved on sale return per specification
        const averageCostAfter = new Prisma.Decimal(product.averageCost);
        const stockValueAfter = newStock.mul(averageCostAfter).toDecimalPlaces(2);
        const itemUnitCost = new Prisma.Decimal(item.unitCost);
        const itemTotalCost = returnedQty.mul(itemUnitCost).toDecimalPlaces(2);

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            saleItemId: item.id,
            type: StockMovementType.SALE_RETURN,
            quantity: returnedQty,
            unitCost: itemUnitCost,
            totalCost: itemTotalCost,
            averageCostAfter,
            balanceAfter: newStock,
            stockValueAfter,
            reason: `Estorno de venda cancelada: ${dto.reason.trim()}`,
            movementDate: canceledDate,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: newStock,
          },
        });

        lockedMap.set(item.productId, {
          ...product,
          currentStock: newStock,
        } as any);
      }

      await tx.sale.update({
        where: { id },
        data: {
          status: SaleStatus.CANCELED,
          cancellationReason: dto.reason.trim(),
          canceledAt: canceledDate,
        },
      });

      const updatedSale = await this.findSaleWithDetails(id, tx);
      return this.formatSaleSummary(updatedSale);
    });
  }

  async findAll(query?: QuerySalesDto) {
    const where: Prisma.SaleWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query?.startDate || query?.endDate) {
      where.saleDate = {};
      if (query.startDate) {
        where.saleDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.saleDate.lte = new Date(query.endDate);
      }
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                unitOfMeasure: true,
              },
            },
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    return sales.map((sale) => this.formatSaleSummary(sale));
  }

  async findOne(id: string) {
    const sale = await this.findSaleWithDetails(id, this.prisma);
    if (!sale) {
      throw new NotFoundException(`Venda com ID "${id}" não foi encontrada.`);
    }
    return this.formatSaleSummary(sale);
  }

  private async findSaleWithDetails(id: string, prismaClient: any) {
    return prismaClient.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                unitOfMeasure: true,
              },
            },
          },
        },
      },
    });
  }

  private formatSaleSummary(sale: any) {
    const subtotal = new Prisma.Decimal(sale.subtotal);
    const discount = new Prisma.Decimal(sale.discount);
    const totalAmount = new Prisma.Decimal(sale.totalAmount);

    let totalCMV = new Prisma.Decimal(0);

    const items = sale.items.map((i: any) => {
      const itemQty = new Prisma.Decimal(i.quantity);
      const itemUnitPrice = new Prisma.Decimal(i.unitPrice);
      const itemSubtotal = new Prisma.Decimal(i.subtotal);
      const itemUnitCost = new Prisma.Decimal(i.unitCost);
      const itemTotalCost = new Prisma.Decimal(i.totalCost);

      totalCMV = totalCMV.add(itemTotalCost);

      return {
        id: i.id,
        productId: i.productId,
        productName: i.product?.name,
        productType: i.product?.type,
        unitOfMeasure: i.product?.unitOfMeasure,
        quantity: itemQty.toFixed(3),
        unitPrice: itemUnitPrice.toFixed(2),
        subtotal: itemSubtotal.toFixed(2),
        unitCost: itemUnitCost.toFixed(4),
        totalCost: itemTotalCost.toFixed(2),
      };
    });

    // Gross profit calculation: totalAmount - totalCMV (discounts reduce revenue, but not COGS)
    const grossProfit = totalAmount.sub(totalCMV).toDecimalPlaces(2);

    return {
      id: sale.id,
      saleDate: sale.saleDate,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      totalCMV: totalCMV.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      notes: sale.notes,
      cancellationReason: sale.cancellationReason,
      canceledAt: sale.canceledAt,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      items,
    };
  }
}
