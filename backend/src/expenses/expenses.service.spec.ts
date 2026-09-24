import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { FinancialScope, FinancialStatus, FinancialType, Prisma } from '@prisma/client';
import { PeriodLockService } from '../monthly-closings/period-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let periodLockService: {
    assertPeriodOpen: jest.Mock;
    assertAllPeriodsOpen: jest.Mock;
    lockAndAssertPeriodOpen: jest.Mock;
    lockAndAssertAllPeriodsOpen: jest.Mock;
  };
  let prisma: {
    financialCategory: {
      findUnique: jest.Mock;
    };
    expense: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      financialCategory: {
        findUnique: jest.fn(),
      },
      expense: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((callback) => callback(prisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    periodLockService = {
      assertPeriodOpen: jest.fn().mockResolvedValue(undefined),
      assertAllPeriodsOpen: jest.fn().mockResolvedValue(undefined),
      lockAndAssertPeriodOpen: jest.fn().mockResolvedValue('2026-09'),
      lockAndAssertAllPeriodsOpen: jest.fn().mockResolvedValue(['2026-09']),
    };

    service = new ExpensesService(
      prisma as unknown as PrismaService,
      periodLockService as unknown as PeriodLockService,
    );
  });

  it('C. should reject creating Expense using an INCOME category', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue({
      id: 'cat-inc',
      name: 'Renda Extra',
      type: FinancialType.INCOME,
      scope: FinancialScope.BUSINESS,
      isActive: true,
    });

    await expect(
      service.create({
        financialCategoryId: 'cat-inc',
        description: 'Despesa indevida com categoria de receita',
        amount: 250,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('E. should create Expense of R$ 2.000 with status PENDING and valid dueDate', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue({
      id: 'cat-exp',
      name: 'Aluguel Comercial',
      type: FinancialType.EXPENSE,
      scope: FinancialScope.BUSINESS,
      isActive: true,
    });

    prisma.expense.create.mockImplementation(({ data, include }) =>
      Promise.resolve({
        id: 'exp-1',
        ...data,
        category: include?.category
          ? {
              id: 'cat-exp',
              name: 'Aluguel Comercial',
              type: FinancialType.EXPENSE,
              scope: FinancialScope.BUSINESS,
              isActive: true,
            }
          : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const dueDateStr = '2026-10-05T00:00:00.000Z';
    const result = await service.create({
      financialCategoryId: 'cat-exp',
      description: 'Aluguel do imóvel',
      amount: 2000,
      status: FinancialStatus.PENDING,
      dueDate: dueDateStr,
    });

    expect(result.id).toBe('exp-1');
    expect(result.amount).toEqual(new Prisma.Decimal(2000));
    expect(result.status).toBe(FinancialStatus.PENDING);
    expect(result.dueDate).toEqual(new Date(dueDateStr));
    expect(result.paymentDate).toBeNull();
  });

  it('F. should update Expense to PAID with paymentDate', async () => {
    prisma.expense.findUnique.mockResolvedValue({
      id: 'exp-1',
      description: 'Aluguel do imóvel',
      amount: new Prisma.Decimal(2000),
      status: FinancialStatus.PENDING,
      dueDate: new Date('2026-10-05T00:00:00.000Z'),
      paymentDate: null,
    });

    const paymentDateStr = '2026-10-04T14:30:00.000Z';

    prisma.expense.update.mockResolvedValue({
      id: 'exp-1',
      description: 'Aluguel do imóvel',
      amount: new Prisma.Decimal(2000),
      status: FinancialStatus.PAID,
      dueDate: new Date('2026-10-05T00:00:00.000Z'),
      paymentDate: new Date(paymentDateStr),
      category: { name: 'Aluguel Comercial' },
    });

    const result = await service.update('exp-1', {
      status: FinancialStatus.PAID,
      paymentDate: paymentDateStr,
    });

    expect(result.status).toBe(FinancialStatus.PAID);
    expect(result.paymentDate).toEqual(new Date(paymentDateStr));
  });

  it('should reject updating to PAID without paymentDate', async () => {
    prisma.expense.findUnique.mockResolvedValue({
      id: 'exp-1',
      description: 'Conta de Energia',
      amount: new Prisma.Decimal(300),
      status: FinancialStatus.PENDING,
      paymentDate: null,
    });

    await expect(
      service.update('exp-1', {
        status: FinancialStatus.PAID,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject creating PENDING Expense with paymentDate', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue({
      id: 'cat-exp',
      name: 'Energia',
      type: FinancialType.EXPENSE,
      scope: FinancialScope.BUSINESS,
      isActive: true,
    });

    await expect(
      service.create({
        financialCategoryId: 'cat-exp',
        description: 'Energia',
        amount: 300,
        status: FinancialStatus.PENDING,
        paymentDate: '2026-10-01T10:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('H. should reject Expense with amount <= 0', async () => {
    await expect(
      service.create({
        financialCategoryId: 'cat-exp',
        description: 'Valor zero',
        amount: 0,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create({
        financialCategoryId: 'cat-exp',
        description: 'Valor negativo',
        amount: -100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('I. should reject Expense with inactive category', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue({
      id: 'cat-exp-inactive',
      name: 'Despesa Inativa',
      type: FinancialType.EXPENSE,
      scope: FinancialScope.BUSINESS,
      isActive: false,
    });

    await expect(
      service.create({
        financialCategoryId: 'cat-exp-inactive',
        description: 'Tentativa em inativa',
        amount: 50,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('J. should list expenses with aggregated totals (pending, paid, canceled, business, personal)', async () => {
    prisma.expense.findMany.mockResolvedValue([
      {
        id: '1',
        amount: new Prisma.Decimal(2000),
        status: FinancialStatus.PENDING,
        category: { scope: FinancialScope.BUSINESS },
      },
      {
        id: '2',
        amount: new Prisma.Decimal(500),
        status: FinancialStatus.PAID,
        category: { scope: FinancialScope.BUSINESS },
      },
      {
        id: '3',
        amount: new Prisma.Decimal(100),
        status: FinancialStatus.CANCELED,
        category: { scope: FinancialScope.BUSINESS },
      },
      {
        id: '4',
        amount: new Prisma.Decimal(1200),
        status: FinancialStatus.PAID,
        category: { scope: FinancialScope.PERSONAL },
      },
    ]);

    const result = await service.findAll();

    expect(result.data).toHaveLength(4);
    expect(result.summary.totalPending).toBe('2000.00'); // 2000
    expect(result.summary.totalPaid).toBe('1700.00'); // 500 + 1200
    expect(result.summary.totalCanceled).toBe('100.00'); // 100
    expect(result.summary.totalBusiness).toBe('2500.00'); // 2000 + 500 (canceled excluded)
    expect(result.summary.totalPersonal).toBe('1200.00'); // 1200 (paid)
  });

  describe('Period Lock Enforcement', () => {
    it('Bloqueia criação de despesa com HTTP 422 em mês fechado', async () => {
      prisma.financialCategory.findUnique.mockResolvedValue({
        id: 'cat-exp',
        name: 'Energia',
        type: FinancialType.EXPENSE,
        isActive: true,
      });

      periodLockService.lockAndAssertPeriodOpen.mockRejectedValueOnce(
        new UnprocessableEntityException('Período 2026-09 está fechado. Reabra o mês antes de realizar alterações.'),
      );

      await expect(
        service.create({
          financialCategoryId: 'cat-exp',
          description: 'Conta de luz em mês fechado',
          amount: 350,
          paymentDate: '2026-09-10T12:00:00.000Z',
          status: FinancialStatus.PAID,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('Bloqueia alteração/cancelamento de despesa com HTTP 422 em mês fechado', async () => {
      prisma.expense.findUnique.mockResolvedValue({
        id: 'exp-locked',
        paymentDate: new Date('2026-09-05T10:00:00.000Z'),
        amount: new Prisma.Decimal(400),
        status: FinancialStatus.PAID,
      });

      periodLockService.lockAndAssertAllPeriodsOpen.mockRejectedValueOnce(
        new UnprocessableEntityException('Período 2026-09 está fechado. Reabra o mês antes de realizar alterações.'),
      );

      await expect(
        service.update('exp-locked', {
          status: FinancialStatus.CANCELED,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
