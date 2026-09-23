import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClosingStatus,
  FinancialScope,
  FinancialStatus,
  LoanPaymentStatus,
  Prisma,
  SaleStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMonthlyClosingDto } from './dto/create-monthly-closing.dto';
import { PreviewMonthlyClosingDto } from './dto/preview-monthly-closing.dto';
import { QueryMonthlyClosingDto } from './dto/query-monthly-closing.dto';

@Injectable()
export class MonthlyClosingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper que formata o referenceMonth e calcula o intervalo estrito de datas [startDate, endDate) em UTC.
   */
  private getDateRange(year: number, month: number) {
    const referenceMonth = `${year}-${String(month).padStart(2, '0')}`;
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0));

    return { referenceMonth, startDate, endDate };
  }

  /**
   * Motor de cálculo compartilhado entre o Preview e o Fechamento Oficial definitivo.
   */
  async calculateMonthlyMetrics(
    client: Prisma.TransactionClient | PrismaService,
    year: number,
    month: number,
  ) {
    const { referenceMonth, startDate, endDate } = this.getDateRange(year, month);
    const dateInterval = { gte: startDate, lt: endDate };

    // ==========================================
    // 1. RESULTADO ECONÔMICO (COMPETÊNCIA / DRE)
    // ==========================================

    // Vendas e CMV (somente COMPLETED)
    const sales = await client.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        saleDate: dateInterval,
      },
      include: {
        items: true,
      },
    });

    let grossRevenue = new Prisma.Decimal(0);
    let cogs = new Prisma.Decimal(0);

    for (const s of sales) {
      grossRevenue = grossRevenue.plus(s.totalAmount);
      for (const item of s.items) {
        cogs = cogs.plus(item.totalCost);
      }
    }

    const grossProfit = grossRevenue.minus(cogs);

    // Outras receitas BUSINESS PAID
    const businessIncomes = await client.income.findMany({
      where: {
        status: FinancialStatus.PAID,
        incomeDate: dateInterval,
        category: {
          scope: FinancialScope.BUSINESS,
        },
      },
    });

    let otherIncomes = new Prisma.Decimal(0);
    for (const inc of businessIncomes) {
      otherIncomes = otherIncomes.plus(inc.amount);
    }

    // Despesas operacionais do estabelecimento (BUSINESS PAID)
    const businessExpensesList = await client.expense.findMany({
      where: {
        status: FinancialStatus.PAID,
        paymentDate: dateInterval,
        category: {
          scope: FinancialScope.BUSINESS,
        },
      },
    });

    let businessExpenses = new Prisma.Decimal(0);
    for (const exp of businessExpensesList) {
      businessExpenses = businessExpenses.plus(exp.amount);
    }

    // Juros de empréstimos (LoanPayment CONFIRMED na competência/pagamento)
    const loanPaymentsList = await client.loanPayment.findMany({
      where: {
        status: LoanPaymentStatus.CONFIRMED,
        paymentDate: dateInterval,
      },
    });

    let loanInterestExpense = new Prisma.Decimal(0);
    let loanPrincipalPaid = new Prisma.Decimal(0);
    let loanPaymentsTotal = new Prisma.Decimal(0);

    for (const lp of loanPaymentsList) {
      loanInterestExpense = loanInterestExpense.plus(lp.interestPaid);
      loanPrincipalPaid = loanPrincipalPaid.plus(lp.principalPaid);
      loanPaymentsTotal = loanPaymentsTotal.plus(lp.amountPaid);
    }

    // operatingResult = Indicador oficial do resultado econômico do NEGÓCIO
    // grossRevenue - cogs + otherIncomes - businessExpenses - loanInterestExpense
    const operatingResult = grossProfit
      .plus(otherIncomes)
      .minus(businessExpenses)
      .minus(loanInterestExpense);

    // Despesas e retiradas pessoais (PERSONAL PAID com paymentDate no período)
    const personalExpensesList = await client.expense.findMany({
      where: {
        status: FinancialStatus.PAID,
        paymentDate: dateInterval,
        category: {
          scope: FinancialScope.PERSONAL,
        },
      },
    });

    let personalExpenses = new Prisma.Decimal(0);
    for (const exp of personalExpensesList) {
      personalExpenses = personalExpenses.plus(exp.amount);
    }

    // netIncome = Resultado final após despesas/retiradas pessoais
    // IMPORTANTE: NÃO deve ser interpretado como lucro líquido operacional da empresa,
    // o qual é medido exclusivamente por operatingResult.
    const netIncome = operatingResult.minus(personalExpenses);

    // ==========================================
    // 2. FLUXO DE CAIXA REAL (DFC)
    // ==========================================

    // Vendas à vista / recebimentos
    const salesCashCollected = grossRevenue;

    // Todas as outras receitas recebidas no caixa (business e personal)
    const allIncomesCollectedList = await client.income.findMany({
      where: {
        status: FinancialStatus.PAID,
        incomeDate: dateInterval,
      },
    });

    let otherIncomesCollected = new Prisma.Decimal(0);
    for (const inc of allIncomesCollectedList) {
      otherIncomesCollected = otherIncomesCollected.plus(inc.amount);
    }

    // Ingressos de novos empréstimos no caixa
    const newLoansList = await client.loan.findMany({
      where: {
        startDate: dateInterval,
      },
    });

    let loanProceeds = new Prisma.Decimal(0);
    for (const l of newLoansList) {
      loanProceeds = loanProceeds.plus(l.principalAmount);
    }

    // Pagamentos reais efetuados a fornecedores (PurchasePayment)
    const purchasePaymentsList = await client.purchasePayment.findMany({
      where: {
        paymentDate: dateInterval,
      },
    });

    let purchasePayments = new Prisma.Decimal(0);
    for (const pp of purchasePaymentsList) {
      purchasePayments = purchasePayments.plus(pp.amount);
    }

    // Despesas efetivamente pagas
    const businessExpensesPaid = businessExpenses;
    const personalExpensesPaid = personalExpenses;

    const totalCashInflows = salesCashCollected
      .plus(otherIncomesCollected)
      .plus(loanProceeds);

    const totalCashOutflows = purchasePayments
      .plus(businessExpensesPaid)
      .plus(personalExpensesPaid)
      .plus(loanPaymentsTotal);

    const netCashFlow = totalCashInflows.minus(totalCashOutflows);

    // ==========================================
    // 3. FOTO PATRIMONIAL NO ENCERRAMENTO
    // ==========================================

    const products = await client.product.findMany({
      where: {
        type: { not: 'SERVICE' },
        isActive: true,
      },
    });

    let stockValue = new Prisma.Decimal(0);
    for (const p of products) {
      stockValue = stockValue.plus(p.currentStock.mul(p.averageCost));
    }

    const openLoans = await client.loan.findMany({
      where: {
        status: { not: 'PAID' },
      },
    });

    let totalDebtRemaining = new Prisma.Decimal(0);
    for (const l of openLoans) {
      totalDebtRemaining = totalDebtRemaining.plus(l.remainingPrincipal);
    }

    // Snapshot analítico detalhado
    const summaryJson = {
      economic: {
        grossRevenue: grossRevenue.toFixed(2),
        cogs: cogs.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        otherIncomes: otherIncomes.toFixed(2),
        businessExpenses: businessExpenses.toFixed(2),
        loanInterestExpense: loanInterestExpense.toFixed(2),
        operatingResult: operatingResult.toFixed(2),
        personalExpenses: personalExpenses.toFixed(2),
        netIncome: netIncome.toFixed(2),
      },
      cashFlow: {
        salesCashCollected: salesCashCollected.toFixed(2),
        otherIncomesCollected: otherIncomesCollected.toFixed(2),
        loanProceeds: loanProceeds.toFixed(2),
        purchasePayments: purchasePayments.toFixed(2),
        businessExpensesPaid: businessExpensesPaid.toFixed(2),
        personalExpensesPaid: personalExpensesPaid.toFixed(2),
        loanPaymentsTotal: loanPaymentsTotal.toFixed(2),
        loanPrincipalPaid: loanPrincipalPaid.toFixed(2),
        loanInterestPaid: loanInterestExpense.toFixed(2),
        totalCashInflows: totalCashInflows.toFixed(2),
        totalCashOutflows: totalCashOutflows.toFixed(2),
        netCashFlow: netCashFlow.toFixed(2),
      },
      balance: {
        stockValue: stockValue.toFixed(2),
        totalDebtRemaining: totalDebtRemaining.toFixed(2),
      },
      counts: {
        salesCompleted: sales.length,
        incomesBusinessPaid: businessIncomes.length,
        expensesBusinessPaid: businessExpensesList.length,
        expensesPersonalPaid: personalExpensesList.length,
        loanPaymentsConfirmed: loanPaymentsList.length,
        purchasePaymentsCount: purchasePaymentsList.length,
      },
    };

    return {
      referenceMonth,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      grossRevenue,
      cogs,
      grossProfit,
      otherIncomes,
      businessExpenses,
      operatingResult,
      personalExpenses,
      netIncome,
      salesCashCollected,
      otherIncomesCollected,
      loanProceeds,
      purchasePayments,
      businessExpensesPaid,
      personalExpensesPaid,
      loanPaymentsTotal,
      loanInterestExpense,
      loanPrincipalPaid,
      totalCashInflows,
      totalCashOutflows,
      netCashFlow,
      stockValue,
      totalDebtRemaining,
      summaryJson,
    };
  }

  // ==========================================
  // PREVIEW
  // ==========================================

  async preview(query: PreviewMonthlyClosingDto) {
    const metrics = await this.calculateMonthlyMetrics(this.prisma, query.year, query.month);

    return {
      referenceMonth: metrics.referenceMonth,
      period: {
        startDate: metrics.startDate,
        endDate: metrics.endDate,
      },
      economicResult: {
        grossRevenue: metrics.grossRevenue.toFixed(2),
        cogs: metrics.cogs.toFixed(2),
        grossProfit: metrics.grossProfit.toFixed(2),
        otherIncomes: metrics.otherIncomes.toFixed(2),
        businessExpenses: metrics.businessExpenses.toFixed(2),
        loanInterestExpense: metrics.loanInterestExpense.toFixed(2),
        operatingResult: metrics.operatingResult.toFixed(2),
        personalExpenses: metrics.personalExpenses.toFixed(2),
        netIncome: metrics.netIncome.toFixed(2),
      },
      cashFlow: {
        salesCashCollected: metrics.salesCashCollected.toFixed(2),
        otherIncomesCollected: metrics.otherIncomesCollected.toFixed(2),
        loanProceeds: metrics.loanProceeds.toFixed(2),
        purchasePayments: metrics.purchasePayments.toFixed(2),
        businessExpensesPaid: metrics.businessExpensesPaid.toFixed(2),
        personalExpensesPaid: metrics.personalExpensesPaid.toFixed(2),
        loanPaymentsTotal: metrics.loanPaymentsTotal.toFixed(2),
        totalCashInflows: metrics.totalCashInflows.toFixed(2),
        totalCashOutflows: metrics.totalCashOutflows.toFixed(2),
        netCashFlow: metrics.netCashFlow.toFixed(2),
      },
      balanceSnapshot: {
        stockValue: metrics.stockValue.toFixed(2),
        totalDebtRemaining: metrics.totalDebtRemaining.toFixed(2),
      },
      summaryJson: metrics.summaryJson,
    };
  }

  // ==========================================
  // CRIAÇÃO DO FECHAMENTO MENSAL (TRANSACTION & LOCK)
  // ==========================================

  async create(dto: CreateMonthlyClosingDto) {
    const { referenceMonth } = this.getDateRange(dto.year, dto.month);

    return this.prisma.$transaction(async (tx) => {
      // 1. Concurrency control: Exclusive PostgreSQL advisory lock on the month
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly_closing:${referenceMonth}`}))`;

      // 2. Find and lock current official closing if exists
      const existingOfficial = await tx.monthlyClosing.findFirst({
        where: {
          referenceMonth,
          status: ClosingStatus.OFFICIAL,
        },
      });

      if (existingOfficial) {
        // Lock row and mark SUPERSEDED
        await tx.$queryRaw`SELECT id FROM monthly_closings WHERE id = ${existingOfficial.id} FOR UPDATE`;
        await tx.monthlyClosing.update({
          where: { id: existingOfficial.id },
          data: {
            status: ClosingStatus.SUPERSEDED,
            isCurrent: false,
            reopenedAt: new Date(),
            reopenReason: dto.reopenReason?.trim() ?? 'Substituído por novo fechamento oficial.',
          },
        });
      }

      // 3. Determine next version number
      const latestVersion = await tx.monthlyClosing.findFirst({
        where: { referenceMonth },
        orderBy: { version: 'desc' },
      });

      const nextVersion = (latestVersion?.version ?? 0) + 1;

      // 4. Calculate metrics within the transaction
      const metrics = await this.calculateMonthlyMetrics(tx, dto.year, dto.month);

      // 5. Create new OFFICIAL version
      return tx.monthlyClosing.create({
        data: {
          referenceMonth,
          version: nextVersion,
          status: ClosingStatus.OFFICIAL,
          isCurrent: true,
          closedAt: new Date(),
          grossRevenue: metrics.grossRevenue,
          cogs: metrics.cogs,
          grossProfit: metrics.grossProfit,
          otherIncomes: metrics.otherIncomes,
          businessExpenses: metrics.businessExpenses,
          operatingResult: metrics.operatingResult,
          personalExpenses: metrics.personalExpenses,
          netIncome: metrics.netIncome,
          salesCashCollected: metrics.salesCashCollected,
          otherIncomesCollected: metrics.otherIncomesCollected,
          loanProceeds: metrics.loanProceeds,
          purchasePayments: metrics.purchasePayments,
          businessExpensesPaid: metrics.businessExpensesPaid,
          personalExpensesPaid: metrics.personalExpensesPaid,
          loanPaymentsTotal: metrics.loanPaymentsTotal,
          netCashFlow: metrics.netCashFlow,
          stockValue: metrics.stockValue,
          totalDebtRemaining: metrics.totalDebtRemaining,
          summaryJson: metrics.summaryJson,
          notes: dto.notes?.trim() ?? null,
        },
      });
    });
  }

  // ==========================================
  // CONSULTAS
  // ==========================================

  async findAll(query?: QueryMonthlyClosingDto) {
    const where: Prisma.MonthlyClosingWhereInput = {};

    if (query?.year && query?.month) {
      where.referenceMonth = `${query.year}-${String(query.month).padStart(2, '0')}`;
    } else if (query?.year) {
      where.referenceMonth = { startsWith: `${query.year}-` };
    }

    if (query?.status) {
      where.status = query.status;
    }

    return this.prisma.monthlyClosing.findMany({
      where,
      orderBy: [{ referenceMonth: 'desc' }, { version: 'desc' }],
    });
  }

  async findOne(id: string) {
    const closing = await this.prisma.monthlyClosing.findUnique({
      where: { id },
    });

    if (!closing) {
      throw new NotFoundException(`Fechamento mensal com ID "${id}" não foi encontrado.`);
    }

    return closing;
  }

  async findByPeriod(year: number, month: number) {
    const referenceMonth = `${year}-${String(month).padStart(2, '0')}`;

    const official = await this.prisma.monthlyClosing.findFirst({
      where: {
        referenceMonth,
        status: ClosingStatus.OFFICIAL,
      },
    });

    const history = await this.prisma.monthlyClosing.findMany({
      where: { referenceMonth },
      orderBy: { version: 'desc' },
    });

    return {
      referenceMonth,
      official,
      history,
    };
  }
}
