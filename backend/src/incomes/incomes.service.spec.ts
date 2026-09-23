import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinancialScope, FinancialStatus, FinancialType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IncomesService } from './incomes.service';

describe('IncomesService', () => {
  let service: IncomesService;
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
  };

  beforeEach(() => {
    prisma = {
      financialCategory: {
        findUnique: jest.fn(),
      },
      income: {
        create: jest.Mock = jest.fn(),
        findMany: jest.Mock = jest.fn(),
        findUnique: jest.Mock = jest.fn(),
        update: jest.Mock = jest.fn(),
      },
    };

    service = new IncomesService(prisma as unknown as PrismaService);
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

  it('should update Income correctly', async () => {
    prisma.income.findUnique.mockResolvedValue({
      id: 'inc-1',
      description: 'Original',
      amount: new Prisma.Decimal(100),
      status: FinancialStatus.PENDING,
    });

    prisma.income.update.mockResolvedValue({
      id: 'inc-1',
      description: 'Atualizada',
      amount: new Prisma.Decimal(150),
      status: FinancialStatus.PAID,
      category: { name: 'Renda' },
    });

    const result = await service.update('inc-1', {
      description: 'Atualizada',
      amount: 150,
      status: FinancialStatus.PAID,
    });

    expect(result.description).toBe('Atualizada');
    expect(result.status).toBe(FinancialStatus.PAID);
  });
});
