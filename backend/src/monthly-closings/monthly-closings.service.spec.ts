import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClosingStatus, FinancialScope, FinancialStatus, LoanPaymentStatus, Prisma, PurchasePaymentStatus, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MonthlyClosingsService } from './monthly-closings.service';

describe('MonthlyClosingsService', () => {
  let service: MonthlyClosingsService;
  let prisma: {
    sale: { findMany: jest.Mock };
    income: { findMany: jest.Mock };
    expense: { findMany: jest.Mock };
    loan: { findMany: jest.Mock };
    loanPayment: { findMany: jest.Mock };
    purchasePayment: { findMany: jest.Mock };
    product: { findMany: jest.Mock };
    monthlyClosing: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      sale: { findMany: jest.fn().mockResolvedValue([]) },
      income: { findMany: jest.fn().mockResolvedValue([]) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
      loan: { findMany: jest.fn().mockResolvedValue([]) },
      loanPayment: { findMany: jest.fn().mockResolvedValue([]) },
      purchasePayment: { findMany: jest.fn().mockResolvedValue([]) },
      product: { findMany: jest.fn().mockResolvedValue([]) },
      monthlyClosing: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new MonthlyClosingsService(prisma as unknown as PrismaService);
  });

  // A to H: Economic Result & Cash Flow calculation
  it('A - H. should accurately calculate operatingResult and cash flow metrics', async () => {
    // A. Sale: Revenue = 1000, CMV = 400
    prisma.sale.findMany.mockResolvedValue([
      {
        id: 'sale-1',
        totalAmount: new Prisma.Decimal(1000),
        status: SaleStatus.COMPLETED,
        items: [{ totalCost: new Prisma.Decimal(400) }],
      },
    ]);

    // B. Other Incomes BUSINESS PAID: + 200
    // K. and for allIncomesCollectedList: 200
    prisma.income.findMany.mockImplementation(({ where }) => {
      if (where.category?.scope === FinancialScope.BUSINESS) {
        return Promise.resolve([
          { id: 'inc-1', amount: new Prisma.Decimal(200), status: FinancialStatus.PAID },
        ]);
      }
      return Promise.resolve([
        { id: 'inc-1', amount: new Prisma.Decimal(200), status: FinancialStatus.PAID },
      ]);
    });

    // C. Expense BUSINESS PAID: - 300
    // E. Expense PERSONAL PAID: 250
    prisma.expense.findMany.mockImplementation(({ where }) => {
      if (where.category?.scope === FinancialScope.BUSINESS) {
        return Promise.resolve([
          { id: 'exp-biz', amount: new Prisma.Decimal(300), status: FinancialStatus.PAID },
        ]);
      }
      if (where.category?.scope === FinancialScope.PERSONAL) {
        return Promise.resolve([
          { id: 'exp-pers', amount: new Prisma.Decimal(250), status: FinancialStatus.PAID },
        ]);
      }
      return Promise.resolve([]);
    });

    // D & G. LoanPayment CONFIRMED: amountPaid = 600, principalPaid = 500, interestPaid = 100 (or 50 + 50)
    // Here: interestPaid = 50, principalPaid = 550, amountPaid = 600
    prisma.loanPayment.findMany.mockResolvedValue([
      {
        id: 'lp-1',
        amountPaid: new Prisma.Decimal(600),
        principalPaid: new Prisma.Decimal(550),
        interestPaid: new Prisma.Decimal(50),
        status: LoanPaymentStatus.CONFIRMED,
      },
    ]);

    // F. Loan received: principalAmount = 5000
    prisma.loan.findMany.mockImplementation(({ where }) => {
      if (where?.startDate) {
        // new loans in period
        return Promise.resolve([
          { id: 'loan-new', principalAmount: new Prisma.Decimal(5000) },
        ]);
      }
      // open loans for balance snapshot
      return Promise.resolve([
        { id: 'loan-new', remainingPrincipal: new Prisma.Decimal(4450) },
      ]);
    });

    // H. PurchasePayment: 700
    prisma.purchasePayment.findMany.mockResolvedValue([
      { id: 'pp-1', amount: new Prisma.Decimal(700) },
    ]);

    // Products for stock value: 100 units @ 4.00 = 400
    prisma.product.findMany.mockResolvedValue([
      { currentStock: new Prisma.Decimal(100), averageCost: new Prisma.Decimal(4) },
    ]);

    const result = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    // Economic validations:
    // grossProfit = 1000 - 400 = 600
    expect(result.grossRevenue.toFixed(2)).toBe('1000.00');
    expect(result.cogs.toFixed(2)).toBe('400.00');
    expect(result.grossProfit.toFixed(2)).toBe('600.00');
    expect(result.otherIncomes.toFixed(2)).toBe('200.00');
    expect(result.businessExpenses.toFixed(2)).toBe('300.00');
    expect(result.loanInterestExpense.toFixed(2)).toBe('50.00');

    // D. operatingResult = 1000 - 400 + 200 - 300 - 50 = 450
    expect(result.operatingResult.toFixed(2)).toBe('450.00');

    // E. personalExpenses = 250 (não afeta operatingResult, mas compõe netIncome)
    expect(result.personalExpenses.toFixed(2)).toBe('250.00');
    expect(result.netIncome.toFixed(2)).toBe('200.00'); // 450 - 250 = 200

    // Cash flow validations:
    // Inflows = 1000 (vendas) + 200 (outras receitas) + 5000 (empréstimo recebido) = 6200
    expect(result.salesCashCollected.toFixed(2)).toBe('1000.00');
    expect(result.otherIncomesCollected.toFixed(2)).toBe('200.00');
    expect(result.loanProceeds.toFixed(2)).toBe('5000.00');
    expect(result.totalCashInflows.toFixed(2)).toBe('6200.00');

    // Outflows = 700 (fornecedor) + 300 (despesas negócio) + 250 (despesas pessoais) + 600 (empréstimo total) = 1850
    expect(result.purchasePayments.toFixed(2)).toBe('700.00');
    expect(result.businessExpensesPaid.toFixed(2)).toBe('300.00');
    expect(result.personalExpensesPaid.toFixed(2)).toBe('250.00');
    expect(result.loanPaymentsTotal.toFixed(2)).toBe('600.00');
    expect(result.totalCashOutflows.toFixed(2)).toBe('1850.00');

    // Net Cash Flow = 6200 - 1850 = 4350
    expect(result.netCashFlow.toFixed(2)).toBe('4350.00');

    // Balance snapshot
    expect(result.stockValue.toFixed(2)).toBe('400.00');
    expect(result.totalDebtRemaining.toFixed(2)).toBe('4450.00');
  });

  // M. Preview: calcula sem criar MonthlyClosing
  it('M. preview should calculate metrics without persisting a MonthlyClosing record', async () => {
    const preview = await service.preview({ year: 2026, month: 9 });

    expect(preview.referenceMonth).toBe('2026-09');
    expect(preview.period.startDate).toBe('2026-09-01T00:00:00.000Z');
    expect(preview.period.endDate).toBe('2026-10-01T00:00:00.000Z');
    expect(preview.economicResult).toBeDefined();
    expect(preview.cashFlow).toBeDefined();
    expect(prisma.monthlyClosing.create).not.toHaveBeenCalled();
  });

  // N & O & Q. Fechamento Oficial, Versionamento e Concorrência
  it('N, O & Q. should create OFFICIAL closing, supersede previous version, and increment version atomically', async () => {
    const mockTx = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      sale: { findMany: jest.fn().mockResolvedValue([]) },
      income: { findMany: jest.fn().mockResolvedValue([]) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
      loan: { findMany: jest.fn().mockResolvedValue([]) },
      loanPayment: { findMany: jest.fn().mockResolvedValue([]) },
      purchasePayment: { findMany: jest.fn().mockResolvedValue([]) },
      product: { findMany: jest.fn().mockResolvedValue([]) },
      monthlyClosing: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            // Existing OFFICIAL v1
            id: 'close-v1',
            referenceMonth: '2026-09',
            version: 1,
            status: ClosingStatus.OFFICIAL,
          })
          .mockResolvedValueOnce({
            // Latest version is 1
            version: 1,
          }),
        update: jest.fn().mockResolvedValue({
          id: 'close-v1',
          status: ClosingStatus.SUPERSEDED,
          isCurrent: false,
        }),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'close-v2',
            ...data,
          }),
        ),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    const result = await service.create({
      year: 2026,
      month: 9,
      reopenReason: 'Ajuste de notas fiscais',
    });

    // Check concurrency lock was called
    expect(mockTx.$executeRaw).toHaveBeenCalled();

    // Check previous official version was marked SUPERSEDED
    expect(mockTx.monthlyClosing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'close-v1' },
        data: expect.objectContaining({
          status: ClosingStatus.SUPERSEDED,
          isCurrent: false,
        }),
      }),
    );

    // Check new version created is 2 and OFFICIAL
    expect(result.version).toBe(2);
    expect(result.status).toBe(ClosingStatus.OFFICIAL);
    expect(result.isCurrent).toBe(true);
    expect(result.referenceMonth).toBe('2026-09');
  });

  // P. Período estrito
  it('P. should construct precise UTC date interval for monthly closing', async () => {
    // Calling private helper indirectly through preview
    const preview = await service.preview({ year: 2026, month: 12 });
    expect(preview.period.startDate).toBe('2026-12-01T00:00:00.000Z');
    expect(preview.period.endDate).toBe('2027-01-01T00:00:00.000Z');
  });

  // I, J, K, L. Cancelados e Pendentes excluídos
  it('I, J, K, L. should query only COMPLETED sales, PAID incomes/expenses and CONFIRMED loan payments', async () => {
    await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    // Vendas: status COMPLETED
    expect(prisma.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: SaleStatus.COMPLETED,
        }),
      }),
    );

    // Incomes: status PAID
    expect(prisma.income.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: FinancialStatus.PAID,
        }),
      }),
    );

    // Expenses: status PAID
    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: FinancialStatus.PAID,
        }),
      }),
    );

    // LoanPayments: status CONFIRMED
    expect(prisma.loanPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: LoanPaymentStatus.CONFIRMED,
        }),
      }),
    );
  });

  // Explicit test cases A, B, C: PENDING exclusion
  it('A. should ignore PENDING incomes within the month (otherIncomes = 0, otherIncomesCollected = 0)', async () => {
    // When only PENDING incomes exist in the month, findMany with status: PAID returns empty
    prisma.income.findMany.mockImplementation(({ where }) => {
      // Prisma query explicitly filters where: { status: FinancialStatus.PAID }
      if (where.status === FinancialStatus.PAID) {
        return Promise.resolve([]);
      }
      return Promise.resolve([{ id: 'inc-pending', amount: new Prisma.Decimal(500), status: FinancialStatus.PENDING }]);
    });

    const result = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    expect(result.otherIncomes.toFixed(2)).toBe('0.00');
    expect(result.otherIncomesCollected.toFixed(2)).toBe('0.00');
  });

  it('B. should ignore PENDING BUSINESS expenses within the month (businessExpenses = 0, businessExpensesPaid = 0)', async () => {
    prisma.expense.findMany.mockImplementation(({ where }) => {
      if (where.status === FinancialStatus.PAID) {
        return Promise.resolve([]);
      }
      return Promise.resolve([{ id: 'exp-pending', amount: new Prisma.Decimal(300), status: FinancialStatus.PENDING }]);
    });

    const result = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    expect(result.businessExpenses.toFixed(2)).toBe('0.00');
    expect(result.businessExpensesPaid.toFixed(2)).toBe('0.00');
  });

  it('C. should ignore PENDING PERSONAL expenses within the month (personalExpenses = 0, personalExpensesPaid = 0)', async () => {
    prisma.expense.findMany.mockImplementation(({ where }) => {
      if (where.status === FinancialStatus.PAID) {
        return Promise.resolve([]);
      }
      return Promise.resolve([{ id: 'exp-pers-pending', amount: new Prisma.Decimal(200), status: FinancialStatus.PENDING }]);
    });

    const result = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    expect(result.personalExpenses.toFixed(2)).toBe('0.00');
    expect(result.personalExpensesPaid.toFixed(2)).toBe('0.00');
  });

  // Explicit test cases D, E: Purchase Payments & Partial Payments
  it('D. should account for partial purchase payment in cash flow even if purchase status is PARTIALLY_PAID', async () => {
    // Purchase total = 1000, but only payment of 400 occurred in the month
    prisma.purchasePayment.findMany.mockResolvedValue([
      { id: 'pp-part', amount: new Prisma.Decimal(400) },
    ]);

    const result = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    expect(result.purchasePayments.toFixed(2)).toBe('400.00');
  });

  it('E. should account for purchase payment split across two months (400 in current month, 600 in next month)', async () => {
    // Current month (2026-09)
    prisma.purchasePayment.findMany.mockImplementation(({ where }) => {
      const gte = where.paymentDate.gte.toISOString();
      if (gte.startsWith('2026-09')) {
        return Promise.resolve([{ id: 'pp-1', amount: new Prisma.Decimal(400) }]);
      }
      if (gte.startsWith('2026-10')) {
        return Promise.resolve([{ id: 'pp-2', amount: new Prisma.Decimal(600) }]);
      }
      return Promise.resolve([]);
    });

    const septResult = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);
    expect(septResult.purchasePayments.toFixed(2)).toBe('400.00');

    const octResult = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 10);
    expect(octResult.purchasePayments.toFixed(2)).toBe('600.00');
  });

  // Explicit test cases F, G: Loan Proceeds
  it('F. should count loanProceeds for loan started in the month even if fully PAID within the same month', async () => {
    // Loan started in September, principalAmount = 5000, already PAID on Sept 25
    prisma.loan.findMany.mockImplementation(({ where }) => {
      if (where?.startDate) {
        return Promise.resolve([
          { id: 'loan-1', principalAmount: new Prisma.Decimal(5000), status: 'PAID' },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    expect(result.loanProceeds.toFixed(2)).toBe('5000.00');
  });

  it('G. should NOT generate loanProceeds for a loan started in an earlier month, even if still ACTIVE', async () => {
    // Loan started in August (2026-08), still ACTIVE in September
    prisma.loan.findMany.mockImplementation(({ where }) => {
      if (where?.startDate) {
        // Query filters startDate in [2026-09-01, 2026-10-01), so August loan is not returned
        return Promise.resolve([]);
      }
      // Balance query for remaining debt
      return Promise.resolve([
        { id: 'loan-aug', remainingPrincipal: new Prisma.Decimal(3000), status: 'ACTIVE' },
      ]);
    });

    const result = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    expect(result.loanProceeds.toFixed(2)).toBe('0.00');
    expect(result.totalDebtRemaining.toFixed(2)).toBe('3000.00');
  });

  // Explicit test case I: PurchasePayment CANCELED is ignored by MonthlyClosing
  it('I. should ignore CANCELED PurchasePayments and query strictly status CONFIRMED in cash flow', async () => {
    prisma.purchasePayment.findMany.mockImplementation(({ where }) => {
      // Prisma query must filter status: PurchasePaymentStatus.CONFIRMED
      if (where.status === PurchasePaymentStatus.CONFIRMED) {
        return Promise.resolve([{ id: 'pp-conf', amount: new Prisma.Decimal(250) }]);
      }
      return Promise.resolve([
        { id: 'pp-conf', amount: new Prisma.Decimal(250) },
        { id: 'pp-canc', amount: new Prisma.Decimal(750) },
      ]);
    });

    const result = await service.calculateMonthlyMetrics(prisma as unknown as PrismaService, 2026, 9);

    expect(prisma.purchasePayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PurchasePaymentStatus.CONFIRMED,
        }),
      }),
    );
    expect(result.purchasePayments.toFixed(2)).toBe('250.00');
  });

  describe('Reabertura Formal e Versionamento', () => {
    it('M. deve reabrir fechamento ativo com sucesso, marcando status = SUPERSEDED e isCurrent = false', async () => {
      const mockClosing = {
        id: 'closing-1',
        referenceMonth: '2026-09',
        status: ClosingStatus.OFFICIAL,
        isCurrent: true,
      };

      prisma.monthlyClosing.findUnique.mockResolvedValue(mockClosing);

      const mockTx = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        $queryRaw: jest.fn().mockResolvedValue([]),
        monthlyClosing: {
          findUnique: jest.fn().mockResolvedValue(mockClosing),
          update: jest.fn().mockImplementation(({ data }) => ({
            ...mockClosing,
            ...data,
          })),
        },
      };

      prisma.$transaction.mockImplementation((callback) => callback(mockTx));

      const result = await service.reopen('closing-1', {
        reason: 'Correção de despesa lançada incorretamente',
      });

      expect(result.status).toBe(ClosingStatus.SUPERSEDED);
      expect(result.isCurrent).toBe(false);
      expect(result.reopenReason).toBe('Correção de despesa lançada incorretamente');
      expect(result.reopenedAt).toBeInstanceOf(Date);
    });

    it('N. deve lançar NotFoundException se o ID do fechamento não existir', async () => {
      prisma.monthlyClosing.findUnique.mockResolvedValue(null);

      await expect(
        service.reopen('non-existent', { reason: 'Motivo qualquer' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('O. deve lançar BadRequestException se tentar reabrir fechamento que já não é OFFICIAL ou não é isCurrent', async () => {
      prisma.monthlyClosing.findUnique.mockResolvedValue({
        id: 'closing-already-superseded',
        referenceMonth: '2026-09',
        status: ClosingStatus.SUPERSEDED,
        isCurrent: false,
      });

      await expect(
        service.reopen('closing-already-superseded', { reason: 'Motivo' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('P. ao fechar novamente um mês reaberto, deve criar novo registro com version incrementada (v2), OFFICIAL e isCurrent', async () => {
      const existingSuperseded = {
        id: 'closing-v1',
        referenceMonth: '2026-09',
        version: 1,
        status: ClosingStatus.SUPERSEDED,
        isCurrent: false,
      };

      const mockTx = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        $queryRaw: jest.fn().mockResolvedValue([]),
        monthlyClosing: {
          findFirst: jest.fn().mockImplementation(({ where, orderBy }) => {
            // First findFirst: checks for existing OFFICIAL -> none
            if (where?.status === ClosingStatus.OFFICIAL) return Promise.resolve(null);
            // Second findFirst: gets latest version -> v1
            if (orderBy?.version === 'desc') return Promise.resolve(existingSuperseded);
            return Promise.resolve(null);
          }),
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'closing-v2', ...data })),
        },
        sale: { findMany: jest.fn().mockResolvedValue([]) },
        income: { findMany: jest.fn().mockResolvedValue([]) },
        expense: { findMany: jest.fn().mockResolvedValue([]) },
        loan: { findMany: jest.fn().mockResolvedValue([]) },
        loanPayment: { findMany: jest.fn().mockResolvedValue([]) },
        purchasePayment: { findMany: jest.fn().mockResolvedValue([]) },
        product: { findMany: jest.fn().mockResolvedValue([]) },
      };

      prisma.$transaction.mockImplementation((callback) => callback(mockTx));

      const newClosing = await service.create({
        year: 2026,
        month: 9,
        notes: 'Refechamento v2',
      });

      expect(newClosing.version).toBe(2);
      expect(newClosing.status).toBe(ClosingStatus.OFFICIAL);
      expect(newClosing.isCurrent).toBe(true);
    });

    it('Q. findByPeriod deve retornar o fechamento oficial atual e o histórico completo', async () => {
      const officialClosing = {
        id: 'closing-v2',
        referenceMonth: '2026-09',
        version: 2,
        status: ClosingStatus.OFFICIAL,
        isCurrent: true,
      };
      const supersededClosing = {
        id: 'closing-v1',
        referenceMonth: '2026-09',
        version: 1,
        status: ClosingStatus.SUPERSEDED,
        isCurrent: false,
      };

      prisma.monthlyClosing.findFirst.mockResolvedValue(officialClosing);
      prisma.monthlyClosing.findMany.mockResolvedValue([officialClosing, supersededClosing]);

      const result = await service.findByPeriod(2026, 9);

      expect(result.referenceMonth).toBe('2026-09');
      expect(result.official?.id).toBe('closing-v2');
      expect(result.history).toHaveLength(2);
      expect(result.history[0].version).toBe(2);
      expect(result.history[1].version).toBe(1);
    });
  });
});
