import { Injectable } from '@nestjs/common';
import { InstallmentStatus, LoanStatus, Prisma, SaleStatus } from '@prisma/client';
import { MonthlyClosingsService } from '../monthly-closings/monthly-closings.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { QueryInventoryDashboardDto } from './dto/query-inventory-dashboard.dto';
import { QueryRangeDashboardDto } from './dto/query-range-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monthlyClosingsService: MonthlyClosingsService,
  ) {}

  /**
   * 1. Resumo mensal executivo consolidado com comparação ao mês anterior.
   */
  async getSummary(query: QueryDashboardDto) {
    const { year, month } = query;

    // Métricas do mês atual (oficial se fechado, preview se aberto)
    const currentData = await this.monthlyClosingsService.getOfficialOrPreview(year, month);

    // Mês anterior para comparação
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevData = await this.monthlyClosingsService.getOfficialOrPreview(prevYear, prevMonth);

    const calcComparison = (current: Prisma.Decimal, previous: Prisma.Decimal) => {
      const absoluteChange = current.minus(previous);
      const percentageChange = previous.isZero()
        ? null
        : Number(absoluteChange.div(previous.abs()).mul(100).toFixed(2));

      return {
        current: current.toFixed(2),
        previous: previous.toFixed(2),
        absoluteChange: absoluteChange.toFixed(2),
        percentageChange,
      };
    };

    return {
      period: {
        year,
        month,
        referenceMonth: currentData.referenceMonth,
        startDate: currentData.startDate,
        endDate: currentData.endDate,
      },
      closing: {
        isClosed: currentData.isOfficial,
        version: currentData.closing?.version ?? null,
        status: currentData.closing?.status ?? null,
        closedAt: currentData.closing?.closedAt ?? null,
      },
      economic: {
        grossRevenue: currentData.metrics.grossRevenue.toFixed(2),
        cogs: currentData.metrics.cogs.toFixed(2),
        grossProfit: currentData.metrics.grossProfit.toFixed(2),
        otherIncomes: currentData.metrics.otherIncomes.toFixed(2),
        businessExpenses: currentData.metrics.businessExpenses.toFixed(2),
        loanInterestExpense: currentData.metrics.loanInterestExpense.toFixed(2),
        operatingResult: currentData.metrics.operatingResult.toFixed(2),
        personalExpenses: currentData.metrics.personalExpenses.toFixed(2),
        resultAfterPersonalExpenses: currentData.metrics.resultAfterPersonalExpenses.toFixed(2),
      },
      cashFlow: {
        salesCashCollected: currentData.metrics.salesCashCollected.toFixed(2),
        otherIncomesCollected: currentData.metrics.otherIncomesCollected.toFixed(2),
        loanProceeds: currentData.metrics.loanProceeds.toFixed(2),
        purchasePayments: currentData.metrics.purchasePayments.toFixed(2),
        businessExpensesPaid: currentData.metrics.businessExpensesPaid.toFixed(2),
        personalExpensesPaid: currentData.metrics.personalExpensesPaid.toFixed(2),
        loanPaymentsTotal: currentData.metrics.loanPaymentsTotal.toFixed(2),
        totalInflows: currentData.metrics.totalInflows.toFixed(2),
        totalOutflows: currentData.metrics.totalOutflows.toFixed(2),
        netCashFlow: currentData.metrics.netCashFlow.toFixed(2),
      },
      position: {
        stockValue: currentData.metrics.stockValue.toFixed(2),
        totalDebtRemaining: currentData.metrics.totalDebtRemaining.toFixed(2),
      },
      comparisonWithPreviousMonth: {
        previousReferenceMonth: prevData.referenceMonth,
        grossRevenue: calcComparison(currentData.metrics.grossRevenue, prevData.metrics.grossRevenue),
        grossProfit: calcComparison(currentData.metrics.grossProfit, prevData.metrics.grossProfit),
        operatingResult: calcComparison(currentData.metrics.operatingResult, prevData.metrics.operatingResult),
        netCashFlow: calcComparison(currentData.metrics.netCashFlow, prevData.metrics.netCashFlow),
      },
    };
  }

  /**
   * 2. Indicadores operacionais de vendas do período.
   */
  async getSalesMetrics(query: QueryDashboardDto) {
    const { startDate, endDate, referenceMonth } = this.monthlyClosingsService.getDateRange(query.year, query.month);
    const dateInterval = { gte: startDate, lt: endDate };

    // Vendas COMPLETED
    const sales = await this.prisma.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        saleDate: dateInterval,
      },
      include: {
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
      },
    });

    // Quantidade de vendas canceladas
    const canceledSalesCount = await this.prisma.sale.count({
      where: {
        status: SaleStatus.CANCELED,
        saleDate: dateInterval,
      },
    });

    let grossRevenue = new Prisma.Decimal(0);
    let cogs = new Prisma.Decimal(0);

    const productMap = new Map<
      string,
      {
        productId: string;
        name: string;
        unit: string;
        quantity: Prisma.Decimal;
        revenue: Prisma.Decimal;
        cogs: Prisma.Decimal;
        grossProfit: Prisma.Decimal;
      }
    >();

    for (const sale of sales) {
      grossRevenue = grossRevenue.plus(sale.totalAmount);
      for (const item of sale.items) {
        cogs = cogs.plus(item.totalCost);

        const existing = productMap.get(item.productId) || {
          productId: item.productId,
          name: item.product.name,
          unit: item.product.unitOfMeasure,
          quantity: new Prisma.Decimal(0),
          revenue: new Prisma.Decimal(0),
          cogs: new Prisma.Decimal(0),
          grossProfit: new Prisma.Decimal(0),
        };

        const itemProfit = item.subtotal.minus(item.totalCost);

        existing.quantity = existing.quantity.plus(item.quantity);
        existing.revenue = existing.revenue.plus(item.subtotal);
        existing.cogs = existing.cogs.plus(item.totalCost);
        existing.grossProfit = existing.grossProfit.plus(itemProfit);

        productMap.set(item.productId, existing);
      }
    }

    const grossProfit = grossRevenue.minus(cogs);
    const completedSalesCount = sales.length;
    const averageTicket =
      completedSalesCount > 0
        ? grossRevenue.div(completedSalesCount)
        : new Prisma.Decimal(0);

    const formatProduct = (p: typeof productMap extends Map<any, infer V> ? V : never) => ({
      productId: p.productId,
      name: p.name,
      unitOfMeasure: p.unit,
      quantitySold: p.quantity.toFixed(3),
      revenue: p.revenue.toFixed(2),
      cogs: p.cogs.toFixed(2),
      grossProfit: p.grossProfit.toFixed(2),
    });

    const allProducts = Array.from(productMap.values());

    const topProductsByRevenue = [...allProducts]
      .sort((a, b) => (b.revenue.greaterThan(a.revenue) ? 1 : b.revenue.equals(a.revenue) ? 0 : -1))
      .slice(0, 5)
      .map(formatProduct);

    const topProductsByQuantity = [...allProducts]
      .sort((a, b) => (b.quantity.greaterThan(a.quantity) ? 1 : b.quantity.equals(a.quantity) ? 0 : -1))
      .slice(0, 5)
      .map(formatProduct);

    const topProductsByGrossProfit = [...allProducts]
      .sort((a, b) => (b.grossProfit.greaterThan(a.grossProfit) ? 1 : b.grossProfit.equals(a.grossProfit) ? 0 : -1))
      .slice(0, 5)
      .map(formatProduct);

    return {
      period: {
        year: query.year,
        month: query.month,
        referenceMonth,
      },
      salesSummary: {
        completedSalesCount,
        canceledSalesCount,
        grossRevenue: grossRevenue.toFixed(2),
        cogs: cogs.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        averageTicket: averageTicket.toFixed(2),
      },
      topProducts: {
        byRevenue: topProductsByRevenue,
        byQuantity: topProductsByQuantity,
        byGrossProfit: topProductsByGrossProfit,
      },
    };
  }

  /**
   * 3. Posição atual de estoque físico (exclui serviços).
   */
  async getInventoryMetrics(query: QueryInventoryDashboardDto) {
    const lowStockLimit = new Prisma.Decimal(query.lowStockLimit ?? 5);

    const products = await this.prisma.product.findMany({
      where: {
        type: { not: 'SERVICE' },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        unitOfMeasure: true,
        currentStock: true,
        averageCost: true,
      },
      orderBy: { currentStock: 'asc' },
    });

    let totalStockValue = new Prisma.Decimal(0);
    const zeroStockItems: Array<any> = [];
    const lowStockItems: Array<any> = [];

    for (const p of products) {
      const itemStockValue = p.currentStock.mul(p.averageCost);
      totalStockValue = totalStockValue.plus(itemStockValue);

      const formatted = {
        id: p.id,
        name: p.name,
        unitOfMeasure: p.unitOfMeasure,
        currentStock: p.currentStock.toFixed(3),
        averageCost: p.averageCost.toFixed(4),
        totalValue: itemStockValue.toFixed(2),
      };

      if (p.currentStock.lte(0)) {
        zeroStockItems.push(formatted);
      } else if (p.currentStock.lte(lowStockLimit)) {
        lowStockItems.push(formatted);
      }
    }

    const lowestStockItems = products.slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      unitOfMeasure: p.unitOfMeasure,
      currentStock: p.currentStock.toFixed(3),
      averageCost: p.averageCost.toFixed(4),
      totalValue: p.currentStock.mul(p.averageCost).toFixed(2),
    }));

    return {
      activePhysicalProductsCount: products.length,
      totalStockValue: totalStockValue.toFixed(2),
      lowStockThreshold: lowStockLimit.toNumber(),
      zeroStockCount: zeroStockItems.length,
      lowStockCount: lowStockItems.length,
      zeroStockItems,
      lowStockItems,
      lowestStockItems,
    };
  }

  /**
   * 4. Posição de dívidas e cronograma de amortização (Loans).
   */
  async getDebtMetrics() {
    const loans = await this.prisma.loan.findMany({
      where: {
        status: { not: LoanStatus.PAID },
      },
      include: {
        installmentsList: {
          where: { status: { not: InstallmentStatus.CANCELED } },
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    let totalOriginalPrincipal = new Prisma.Decimal(0);
    let totalRemainingPrincipal = new Prisma.Decimal(0);

    for (const l of loans) {
      totalOriginalPrincipal = totalOriginalPrincipal.plus(l.principalAmount);
      totalRemainingPrincipal = totalRemainingPrincipal.plus(l.remainingPrincipal);
    }

    const now = new Date();
    const overdueInstallments: Array<any> = [];
    const upcomingInstallments: Array<any> = [];
    let totalOverdueAmount = new Prisma.Decimal(0);

    for (const loan of loans) {
      for (const inst of loan.installmentsList) {
        if (inst.status === InstallmentStatus.PAID) continue;

        const remainingAmount = inst.expectedAmount.minus(inst.paidAmount);
        const item = {
          installmentId: inst.id,
          loanId: loan.id,
          lenderName: loan.lenderName,
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate.toISOString().split('T')[0],
          expectedAmount: inst.expectedAmount.toFixed(2),
          paidAmount: inst.paidAmount.toFixed(2),
          remainingAmount: remainingAmount.toFixed(2),
          status: inst.status,
        };

        if (inst.dueDate < now) {
          overdueInstallments.push(item);
          totalOverdueAmount = totalOverdueAmount.plus(remainingAmount);
        } else {
          upcomingInstallments.push(item);
        }
      }
    }

    // Ordenar próximos vencimentos por data crescente
    upcomingInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    overdueInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      totalOriginalPrincipal: totalOriginalPrincipal.toFixed(2),
      totalRemainingPrincipal: totalRemainingPrincipal.toFixed(2),
      activeLoansCount: loans.length,
      overdueInstallmentsCount: overdueInstallments.length,
      totalOverdueAmount: totalOverdueAmount.toFixed(2),
      overdueInstallments,
      upcomingInstallments: upcomingInstallments.slice(0, 10),
      activeLoans: loans.map((l) => ({
        id: l.id,
        lenderName: l.lenderName,
        description: l.description,
        principalAmount: l.principalAmount.toFixed(2),
        totalPayable: l.totalPayable.toFixed(2),
        remainingPrincipal: l.remainingPrincipal.toFixed(2),
        installments: l.installments,
        status: l.status,
        startDate: l.startDate.toISOString().split('T')[0],
      })),
    };
  }

  /**
   * 5. Série temporal de Fluxo de Caixa (mês fechado usa oficial, aberto usa preview).
   */
  async getCashFlowSeries(query: QueryRangeDashboardDto) {
    const periods = this.buildPeriodsList(query.months ?? 6, query.year, query.month);
    const series: Array<any> = [];

    for (const p of periods) {
      const result = await this.monthlyClosingsService.getOfficialOrPreview(p.year, p.month);
      series.push({
        referenceMonth: result.referenceMonth,
        isClosed: result.isOfficial,
        inflows: result.metrics.totalInflows.toFixed(2),
        outflows: result.metrics.totalOutflows.toFixed(2),
        netCashFlow: result.metrics.netCashFlow.toFixed(2),
      });
    }

    return series;
  }

  /**
   * 6. Série temporal de DRE / Resultados Econômicos (mês fechado usa oficial, aberto usa preview).
   */
  async getTrendsSeries(query: QueryRangeDashboardDto) {
    const periods = this.buildPeriodsList(query.months ?? 6, query.year, query.month);
    const series: Array<any> = [];

    for (const p of periods) {
      const result = await this.monthlyClosingsService.getOfficialOrPreview(p.year, p.month);
      series.push({
        referenceMonth: result.referenceMonth,
        isClosed: result.isOfficial,
        grossRevenue: result.metrics.grossRevenue.toFixed(2),
        grossProfit: result.metrics.grossProfit.toFixed(2),
        operatingResult: result.metrics.operatingResult.toFixed(2),
        netCashFlow: result.metrics.netCashFlow.toFixed(2),
      });
    }

    return series;
  }

  /**
   * Helper que gera a sequência de { year, month } retroativa em ordem cronológica crescente.
   */
  private buildPeriodsList(monthsCount: number, anchorYear?: number, anchorMonth?: number) {
    const now = new Date();
    let currentYear = anchorYear ?? now.getUTCFullYear();
    let currentMonth = anchorMonth ?? now.getUTCMonth() + 1;

    const periods: Array<{ year: number; month: number }> = [];

    for (let i = 0; i < monthsCount; i++) {
      periods.unshift({ year: currentYear, month: currentMonth });
      currentMonth--;
      if (currentMonth === 0) {
        currentMonth = 12;
        currentYear--;
      }
    }

    return periods;
  }
}
