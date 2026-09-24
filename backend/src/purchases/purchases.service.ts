import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemType, PaymentMethod, Prisma, PurchasePaymentStatus, PurchaseStatus, StockMovementType } from '@prisma/client';
import { PeriodLockService } from '../monthly-closings/period-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelPurchasePaymentDto } from './dto/cancel-purchase-payment.dto';
import { CreatePurchasePaymentDto } from './dto/create-purchase-payment.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodLockService: PeriodLockService,
  ) {}

  async create(dto: CreatePurchaseDto) {
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
      });

      if (!supplier) {
        throw new NotFoundException(`Fornecedor com ID "${dto.supplierId}" não foi encontrado.`);
      }

      if (!supplier.isActive) {
        throw new BadRequestException(`Não é possível registrar compra para fornecedor inativo.`);
      }
    }

    const uniqueProductIds = [...new Set(dto.items.map((i) => i.productId))].sort();

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException(`Um ou mais produtos informados na compra não foram encontrados.`);
    }

    for (const product of products) {
      if (!product.isActive) {
        throw new BadRequestException(`O produto "${product.name}" está inativo.`);
      }
      if (product.type === ItemType.SERVICE) {
        throw new BadRequestException(
          `O item "${product.name}" é do tipo SERVICE e não pode ser adquirido como estoque.`,
        );
      }
    }

    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Transactional advisory lock & period check
      await this.periodLockService.lockAndAssertPeriodOpen(tx, purchaseDate);

      // 2. Lock rows in deterministic order to prevent deadlocks
      for (const pid of uniqueProductIds) {
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${pid} FOR UPDATE`;
      }

      // Re-fetch locked fresh records
      const lockedProducts = await tx.product.findMany({
        where: { id: { in: uniqueProductIds } },
      });
      const lockedMap = new Map(lockedProducts.map((p) => [p.id, p]));

      // Pre-calculate totals and new CMPs for all items
      let totalPurchaseAmount = new Prisma.Decimal(0);
      const calculatedItems = dto.items.map((item) => {
        const product = lockedMap.get(item.productId)!;
        const currentStock = new Prisma.Decimal(product.currentStock);
        const currentAverageCost = new Prisma.Decimal(product.averageCost);
        const itemQty = new Prisma.Decimal(item.quantity);
        const itemUnitCost = new Prisma.Decimal(item.unitCost);
        const itemTotalCost = itemQty.mul(itemUnitCost).toDecimalPlaces(2);

        totalPurchaseAmount = totalPurchaseAmount.add(itemTotalCost);

        // Weighted Average Cost calculation:
        // If current stock is <= 0 (e.g. initial or zero balance), new CMP is the purchase price
        let newAverageCost: Prisma.Decimal;
        if (currentStock.lte(0)) {
          newAverageCost = itemUnitCost;
        } else {
          const currentTotalVal = currentStock.mul(currentAverageCost);
          const incomingVal = itemQty.mul(itemUnitCost);
          const newStock = currentStock.add(itemQty);
          newAverageCost = currentTotalVal.add(incomingVal).div(newStock);
        }

        const newStock = currentStock.add(itemQty);
        const newStockValue = newStock.mul(newAverageCost).toDecimalPlaces(2);

        // Update product in memory for next item if same product appears twice in purchase
        lockedMap.set(item.productId, {
          ...product,
          currentStock: newStock,
          averageCost: newAverageCost,
        } as any);

        return {
          productId: item.productId,
          quantity: itemQty,
          unitCost: itemUnitCost,
          totalCost: itemTotalCost,
          newAverageCost,
          newStock,
          newStockValue,
        };
      });

      // Handle payment logic
      let paidAmount = new Prisma.Decimal(0);
      let status: PurchaseStatus = PurchaseStatus.PENDING;
      let initialPaymentRecord: { amount: Prisma.Decimal; paymentMethod: PaymentMethod; notes?: string } | null = null;

      if (dto.initialPayment && dto.initialPayment.amount > 0) {
        const payAmount = new Prisma.Decimal(dto.initialPayment.amount);
        if (payAmount.gt(totalPurchaseAmount)) {
          throw new BadRequestException(
            `O valor do pagamento inicial (R$ ${payAmount.toFixed(2)}) não pode exceder o total da compra (R$ ${totalPurchaseAmount.toFixed(2)}).`,
          );
        }

        paidAmount = payAmount;
        status = payAmount.equals(totalPurchaseAmount)
          ? PurchaseStatus.PAID
          : PurchaseStatus.PARTIALLY_PAID;

        initialPaymentRecord = {
          amount: payAmount,
          paymentMethod: dto.initialPayment.paymentMethod || PaymentMethod.PIX,
          notes: dto.initialPayment.notes?.trim(),
        };
      }

      // Create purchase header
      const purchase = await tx.purchase.create({
        data: {
          supplierId: dto.supplierId,
          purchaseDate,
          totalAmount: totalPurchaseAmount,
          paidAmount,
          status,
          notes: dto.notes?.trim(),
        },
      });

      // Create initial payment if registered
      if (initialPaymentRecord) {
        await tx.purchasePayment.create({
          data: {
            purchaseId: purchase.id,
            amount: initialPaymentRecord.amount,
            paymentMethod: initialPaymentRecord.paymentMethod,
            paymentDate: purchaseDate,
            notes: initialPaymentRecord.notes,
          },
        });
      }

      // Create items, stock movements, and update products
      for (const item of calculatedItems) {
        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            purchaseItemId: purchaseItem.id,
            type: StockMovementType.PURCHASE,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            averageCostAfter: item.newAverageCost,
            balanceAfter: item.newStock,
            stockValueAfter: item.newStockValue,
            reason: 'Entrada por compra de estoque',
            movementDate: purchaseDate,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: item.newStock,
            averageCost: item.newAverageCost,
          },
        });
      }

      const purchaseWithDetails = await this.findPurchaseWithDetails(purchase.id, tx);
      return this.formatPurchaseSummary(purchaseWithDetails);
    });
  }

  async addPayment(purchaseId: string, dto: CreatePurchasePaymentDto) {
    const paymentAmount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      // Row lock to serialize payments on this purchase
      await tx.$queryRaw`SELECT id FROM purchases WHERE id = ${purchaseId} FOR UPDATE`;

      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
      });

      if (!purchase) {
        throw new NotFoundException(`Compra com ID "${purchaseId}" não foi encontrada.`);
      }

      if (purchase.status === PurchaseStatus.CANCELED) {
        throw new BadRequestException(`Compras canceladas não podem receber pagamentos.`);
      }

      if (purchase.status === PurchaseStatus.PAID) {
        throw new BadRequestException(`Esta compra já está totalmente quitada.`);
      }

      // Sum only CONFIRMED payments
      const confirmedPayments = await tx.purchasePayment.findMany({
        where: {
          purchaseId,
          status: PurchasePaymentStatus.CONFIRMED,
        },
      });

      let currentPaid = new Prisma.Decimal(0);
      for (const p of confirmedPayments) {
        currentPaid = currentPaid.add(p.amount);
      }

      const totalAmount = new Prisma.Decimal(purchase.totalAmount);
      const remainingAmount = totalAmount.sub(currentPaid);

      if (paymentAmount.gt(remainingAmount)) {
        throw new BadRequestException(
          `O pagamento de R$ ${paymentAmount.toFixed(2)} excede o saldo devedor restante de R$ ${remainingAmount.toFixed(2)}.`,
        );
      }

      const newPaidAmount = currentPaid.add(paymentAmount);
      const newStatus = newPaidAmount.equals(totalAmount)
        ? PurchaseStatus.PAID
        : PurchaseStatus.PARTIALLY_PAID;

      const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
      await this.periodLockService.lockAndAssertPeriodOpen(tx, paymentDate);

      await tx.purchasePayment.create({
        data: {
          purchaseId,
          amount: paymentAmount,
          paymentMethod: dto.paymentMethod || PaymentMethod.PIX,
          status: PurchasePaymentStatus.CONFIRMED,
          paymentDate,
          notes: dto.notes?.trim(),
        },
      });

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      const purchaseWithDetails = await this.findPurchaseWithDetails(purchaseId, tx);
      return this.formatPurchaseSummary(purchaseWithDetails);
    });
  }

  async cancelPayment(purchaseId: string, paymentId: string, dto: CancelPurchasePaymentDto) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('O motivo do cancelamento é obrigatório.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock Purchase
      await tx.$queryRaw`SELECT id FROM purchases WHERE id = ${purchaseId} FOR UPDATE`;

      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
      });

      if (!purchase) {
        throw new NotFoundException(`Compra com ID "${purchaseId}" não foi encontrada.`);
      }

      // 2. Lock PurchasePayment
      await tx.$queryRaw`SELECT id FROM purchase_payments WHERE id = ${paymentId} FOR UPDATE`;

      const payment = await tx.purchasePayment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException(`Pagamento com ID "${paymentId}" não foi encontrado.`);
      }

      if (payment.purchaseId !== purchaseId) {
        throw new BadRequestException('O pagamento informado não pertence a esta compra.');
      }

      if (payment.status === PurchasePaymentStatus.CANCELED) {
        throw new BadRequestException('Este pagamento já foi cancelado anteriormente.');
      }

      await this.periodLockService.lockAndAssertPeriodOpen(tx, payment.paymentDate);

      // 3. Mark payment as CANCELED
      await tx.purchasePayment.update({
        where: { id: paymentId },
        data: {
          status: PurchasePaymentStatus.CANCELED,
          canceledAt: new Date(),
          cancellationReason: dto.reason.trim(),
        },
      });

      // 4. Recalculate strictly summing CONFIRMED payments
      const activePayments = await tx.purchasePayment.findMany({
        where: {
          purchaseId,
          status: PurchasePaymentStatus.CONFIRMED,
        },
      });

      let newPaidAmount = new Prisma.Decimal(0);
      for (const p of activePayments) {
        newPaidAmount = newPaidAmount.add(p.amount);
      }

      const totalAmount = new Prisma.Decimal(purchase.totalAmount);

      if (newPaidAmount.lt(0) || newPaidAmount.gt(totalAmount)) {
        throw new BadRequestException('Inconsistência no valor recalculado de pagamentos da compra.');
      }

      let newStatus: PurchaseStatus;
      if (newPaidAmount.equals(0)) {
        newStatus = PurchaseStatus.PENDING;
      } else if (newPaidAmount.equals(totalAmount)) {
        newStatus = PurchaseStatus.PAID;
      } else {
        newStatus = PurchaseStatus.PARTIALLY_PAID;
      }

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      const purchaseWithDetails = await this.findPurchaseWithDetails(purchaseId, tx);
      return this.formatPurchaseSummary(purchaseWithDetails);
    });
  }

  async findAll() {
    const purchases = await this.prisma.purchase.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unitOfMeasure: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    return purchases.map((p) => this.formatPurchaseSummary(p));
  }

  async findOne(id: string) {
    const purchase = await this.findPurchaseWithDetails(id, this.prisma);
    if (!purchase) {
      throw new NotFoundException(`Compra com ID "${id}" não foi encontrada.`);
    }
    return this.formatPurchaseSummary(purchase);
  }

  private async findPurchaseWithDetails(id: string, prismaClient: any) {
    return prismaClient.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unitOfMeasure: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });
  }

  private formatPurchaseSummary(purchase: any) {
    const totalAmount = new Prisma.Decimal(purchase.totalAmount);
    const paidAmount = new Prisma.Decimal(purchase.paidAmount);
    const remainingAmount = totalAmount.sub(paidAmount).toDecimalPlaces(2);

    return {
      id: purchase.id,
      supplierId: purchase.supplierId,
      supplier: purchase.supplier,
      purchaseDate: purchase.purchaseDate,
      totalAmount: totalAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      remainingAmount: remainingAmount.toFixed(2),
      status: purchase.status,
      notes: purchase.notes,
      cancellationReason: purchase.cancellationReason,
      canceledAt: purchase.canceledAt,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
      items: (purchase.items || []).map((i: any) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product?.name,
        unitOfMeasure: i.product?.unitOfMeasure,
        quantity: new Prisma.Decimal(i.quantity).toFixed(3),
        unitCost: new Prisma.Decimal(i.unitCost).toFixed(4),
        totalCost: new Prisma.Decimal(i.totalCost).toFixed(2),
      })),
      payments: (purchase.payments || []).map((p: any) => ({
        id: p.id,
        amount: new Prisma.Decimal(p.amount).toFixed(2),
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        status: p.status,
        canceledAt: p.canceledAt,
        cancellationReason: p.cancellationReason,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
    };
  }
}
