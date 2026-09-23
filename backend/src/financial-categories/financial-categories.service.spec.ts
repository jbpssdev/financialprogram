import { ConflictException, NotFoundException } from '@nestjs/common';
import { FinancialScope, FinancialType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCategoriesService } from './financial-categories.service';

describe('FinancialCategoriesService', () => {
  let service: FinancialCategoriesService;
  let prisma: {
    financialCategory: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      financialCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new FinancialCategoriesService(prisma as unknown as PrismaService);
  });

  it('A. should create a FinancialCategory with type INCOME and scope BUSINESS', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue(null);
    prisma.financialCategory.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'cat-inc-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await service.create({
      name: 'Renda Extra',
      type: FinancialType.INCOME,
      scope: FinancialScope.BUSINESS,
    });

    expect(result.id).toBe('cat-inc-1');
    expect(result.name).toBe('Renda Extra');
    expect(result.type).toBe(FinancialType.INCOME);
    expect(result.scope).toBe(FinancialScope.BUSINESS);
    expect(result.isActive).toBe(true);
  });

  it('B. should create a FinancialCategory with type EXPENSE and scope BUSINESS', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue(null);
    prisma.financialCategory.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'cat-exp-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await service.create({
      name: 'Aluguel',
      type: FinancialType.EXPENSE,
      scope: FinancialScope.BUSINESS,
    });

    expect(result.id).toBe('cat-exp-1');
    expect(result.name).toBe('Aluguel');
    expect(result.type).toBe(FinancialType.EXPENSE);
    expect(result.scope).toBe(FinancialScope.BUSINESS);
  });

  it('should prevent duplicate categories with same name, type, and scope', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue({
      id: 'existing-id',
      name: 'Aluguel',
      type: FinancialType.EXPENSE,
      scope: FinancialScope.BUSINESS,
    });

    await expect(
      service.create({
        name: 'Aluguel',
        type: FinancialType.EXPENSE,
        scope: FinancialScope.BUSINESS,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should find all categories with filters', async () => {
    prisma.financialCategory.findMany.mockResolvedValue([
      { id: '1', name: 'Aluguel', type: FinancialType.EXPENSE, scope: FinancialScope.BUSINESS, isActive: true },
    ]);

    const result = await service.findAll({ type: FinancialType.EXPENSE, scope: FinancialScope.BUSINESS });
    expect(result).toHaveLength(1);
    expect(prisma.financialCategory.findMany).toHaveBeenCalled();
  });

  it('should throw NotFoundException when finding non-existent category', async () => {
    prisma.financialCategory.findUnique.mockResolvedValue(null);
    await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
  });

  it('should update category name and active status', async () => {
    prisma.financialCategory.findUnique
      .mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Aluguel',
        type: FinancialType.EXPENSE,
        scope: FinancialScope.BUSINESS,
        isActive: true,
      })
      .mockResolvedValueOnce(null); // No conflict

    prisma.financialCategory.update.mockResolvedValue({
      id: 'cat-1',
      name: 'Aluguel Comercial',
      type: FinancialType.EXPENSE,
      scope: FinancialScope.BUSINESS,
      isActive: false,
    });

    const result = await service.update('cat-1', {
      name: 'Aluguel Comercial',
      isActive: false,
    });

    expect(result.name).toBe('Aluguel Comercial');
    expect(result.isActive).toBe(false);
  });
});
