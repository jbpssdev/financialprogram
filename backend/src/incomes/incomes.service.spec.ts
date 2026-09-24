import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { FinancialScope, FinancialStatus, FinancialType, Prisma } from '@prisma/client';
import { PeriodLockService } from '../monthly-closings/period-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { IncomesService } from './incomes.service';

describe('IncomesService', () => {
  let service: IncomesService;
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
    income: {
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
      income: {
        create: (jest.fn() as any),
        findMany: (jest.fn() as any),
        findUnique: (jest.fn() as any),
        update: (jest.fn() as any),
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

    service = new IncomesService(
      prisma as unknown as PrismaService,
      periodLockService as unknown as PeriodLockService,
    );
  });

  it('D. should reject creating Income using an EXPENSE category', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue({
      id: 'cat-exp',
      name: 'Aluguel',
      type: FinancialType.EXPENSE,
      scope: FinancialScope.BUSINESS,
      isActive: true,
    });

    await expect(
      service.create({
        financialCategoryId: 'cat-exp',
        description: 'Recebimento indevido em despesa',
        amount: 500,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('G. should create Income of R$ 850 with status PAID correctly', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue({
      id: 'cat-inc',
      name: 'Renda Extra',
      type: FinancialType.INCOME,
      scope: FinancialScope.BUSINESS,
      isActive: true,
    });

    prisma.income.create.mockImplementation(({ data, include }) =>
      Promise.resolve({
        id: 'inc-1',
        ...data,
        category: include?.category
          ? {
              id: 'cat-inc',
              name: 'Renda Extra',
              type: FinancialType.INCOME,
              scope: FinancialScope.BUSINESS,
              isActive: true,
            }
          : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await service.create({
      financialCategoryId: 'cat-inc',
      description: 'Venda de equipamento antigo',
      amount: 850,
      status: FinancialStatus.PAID,
    });

    expect(result.id).toBe('inc-1');
    expect(result.amount).toEqual(new Prisma.Decimal(850));
    expect(result.status).toBe(FinancialStatus.PAID);
    expect(result.description).toBe('Venda de equipamento antigo');
  });

  it('H. should reject Income with amount <= 0', async () => {
    await expect(
      service.create({
        financialCategoryId: 'cat-inc',
        description: 'Valor zero',
        amount: 0,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create({
        financialCategoryId: 'cat-inc',
        description: 'Valor negativo',
        amount: -50,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('I. should reject Income with inactive category', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue({
      id: 'cat-inc-inactive',
      name: 'Renda Desativada',
      type: FinancialType.INCOME,
      scope: FinancialScope.BUSINESS,
      isActive: false,
    });

    await expect(
      service.create({
        financialCategoryId: 'cat-inc-inactive',
        description: 'Tentativa em categoria inativa',
        amount: 100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if category does not exist', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        financialCategoryId: 'non-existent',
        description: 'Sem categoria',
        amount: 100,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('J. should list incomes with aggregated totals (pending, paid, canceled, business, personal)', async () => {
    prisma.income.findMany.mockResolvedValue([
      {
        id: '1',
        amount: new Prisma.Decimal(500),
        status: FinancialStatus.PAID,
        category: { scope: FinancialScope.BUSINESS },
      },
      {
        id: '2',
        amount: new Prisma.Decimal(300),
        status: FinancialStatus.PENDING,
        category: { scope: FinancialScope.BUSINESS },
      },
      {
        id: '3',
        amount: new Prisma.Decimal(200),
        status: FinancialStatus.CANCELED,
        category: { scope: FinancialScope.BUSINESS },
      },
      {
        id: '4',
        amount: new Prisma.Decimal(150),
        status: FinancialStatus.PAID,
        category: { scope: FinancialScope.PERSONAL },
      },
    ]);

    const result = await service.findAll();

    expect(result.data).toHaveLength(4);
    expect(result.summary.totalPaid).toBe('650.00'); // 500 + 150
    expect(result.summary.totalPending).toBe('300.00'); // 300
    expect(result.summary.totalCanceled).toBe('200.00'); // 200
    expect(result.summary.totalBusiness).toBe('800.00'); // 500 + 300 (canceled not included)
    expect(result.summary.totalPersonal).toBe('150.00'); // 150 (paid)
  });

  describe('Auditoria e Mutabilidade de Income (Requisitos A a J)', () => {
    // A. PENDING pode alterar amount
    it('A. PENDING pode alterar amount', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-p1',
        amount: new Prisma.Decimal(100),
        status: FinancialStatus.PENDING,
        incomeDate: new Date('2026-09-10'),
      });
      prisma.income.update.mockResolvedValue({
        id: 'inc-p1',
        amount: new Prisma.Decimal(250),
        status: FinancialStatus.PENDING,
      });

      const result = await service.update('inc-p1', { amount: 250 });
      expect(result.amount).toEqual(new Prisma.Decimal(250));
    });

    // B. PENDING -> PAID funciona
    it('B. PENDING -> PAID funciona', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-p2',
        amount: new Prisma.Decimal(300),
        status: FinancialStatus.PENDING,
        incomeDate: new Date('2026-09-10'),
      });
      prisma.income.update.mockResolvedValue({
        id: 'inc-p2',
        amount: new Prisma.Decimal(300),
        status: FinancialStatus.PAID,
      });

      const result = await service.update('inc-p2', { status: FinancialStatus.PAID });
      expect(result.status).toBe(FinancialStatus.PAID);
    });

    // C. PAID não pode alterar amount
    it('C. PAID não pode alterar amount', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-paid1',
        amount: new Prisma.Decimal(500),
        status: FinancialStatus.PAID,
        incomeDate: new Date('2026-09-10'),
      });

      await expect(service.update('inc-paid1', { amount: 600 })).rejects.toThrow(
        BadRequestException,
      );
    });

    // D. PAID não pode alterar incomeDate
    it('D. PAID não pode alterar incomeDate', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-paid2',
        amount: new Prisma.Decimal(500),
        status: FinancialStatus.PAID,
        incomeDate: new Date('2026-09-10T00:00:00.000Z'),
      });

      await expect(service.update('inc-paid2', { incomeDate: '2026-09-20T00:00:00.000Z' })).rejects.toThrow(
        BadRequestException,
      );
    });

    // E. PAID não pode alterar financialCategoryId
    it('E. PAID não pode alterar financialCategoryId', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-paid3',
        amount: new Prisma.Decimal(500),
        financialCategoryId: 'cat-1',
        status: FinancialStatus.PAID,
        incomeDate: new Date('2026-09-10'),
      });

      await expect(service.update('inc-paid3', { financialCategoryId: 'cat-2' })).rejects.toThrow(
        BadRequestException,
      );
    });

    // F. PAID pode ser cancelado via endpoint
    it('F. PAID pode ser cancelado via endpoint', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-paid4',
        amount: new Prisma.Decimal(500),
        status: FinancialStatus.PAID,
        incomeDate: new Date('2026-09-10'),
      });
      prisma.income.update.mockResolvedValue({
        id: 'inc-paid4',
        status: FinancialStatus.CANCELED,
        cancellationReason: 'Lançamento duplicado',
        canceledAt: new Date(),
      });

      const result = await service.cancel('inc-paid4', { reason: 'Lançamento duplicado' });
      expect(result.status).toBe(FinancialStatus.CANCELED);
      expect(result.cancellationReason).toBe('Lançamento duplicado');
    });

    // G. CANCELED mantém dados originais e motivo
    it('G. CANCELED mantém dados originais e motivo', async () => {
      const now = new Date();
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-canc',
        amount: new Prisma.Decimal(700),
        status: FinancialStatus.CANCELED,
        cancellationReason: 'Erro operacional',
        canceledAt: now,
      });

      const result = await service.findOne('inc-canc');
      expect(result.amount).toEqual(new Prisma.Decimal(700));
      expect(result.status).toBe(FinancialStatus.CANCELED);
      expect(result.cancellationReason).toBe('Erro operacional');
      expect(result.canceledAt).toEqual(now);
    });

    // H. CANCELED não pode ser reativado
    it('H. CANCELED não pode ser reativado', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-canc2',
        amount: new Prisma.Decimal(700),
        status: FinancialStatus.CANCELED,
      });

      await expect(service.update('inc-canc2', { status: FinancialStatus.PAID })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('inc-canc2', { status: FinancialStatus.PENDING })).rejects.toThrow(
        BadRequestException,
      );
    });

    // I. Duplo cancelamento bloqueado
    it('I. Duplo cancelamento bloqueado', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-canc3',
        status: FinancialStatus.CANCELED,
      });

      await expect(
        service.cancel('inc-canc3', { reason: 'Tentativa de cancelar novamente' }),
      ).rejects.toThrow(BadRequestException);
    });

    // J. Cancelamento em período fechado bloqueado com 422
    it('J. Cancelamento em período fechado bloqueado com 422', async () => {
      prisma.income.findUnique.mockResolvedValue({
        id: 'inc-locked-cancel',
        incomeDate: new Date('2026-09-05T10:00:00.000Z'),
        amount: new Prisma.Decimal(200),
        status: FinancialStatus.PAID,
      });

      periodLockService.lockAndAssertPeriodOpen.mockRejectedValueOnce(
        new UnprocessableEntityException('Período 2026-09 está fechado. Reabra o mês antes de realizar alterações.'),
      );

      await expect(
        service.cancel('inc-locked-cancel', { reason: 'Estorno fora do período' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('Period Lock Enforcement', () => {
    it('Bloqueia criação de receita com HTTP 422 em mês fechado', async () => {
      prisma.financialCategory.findUnique.mockResolvedValue({
        id: 'cat-inc',
        name: 'Vendas',
        type: FinancialType.INCOME,
        isActive: true,
      });

      periodLockService.lockAndAssertPeriodOpen.mockRejectedValueOnce(
        new UnprocessableEntityException('Período 2026-09 está fechado. Reabra o mês antes de realizar alterações.'),
      );

      await expect(
        service.create({
          financialCategoryId: 'cat-inc',
          description: 'Receita em mês fechado',
          amount: 500,
          incomeDate: '2026-09-10T12:00:00.000Z',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
