import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialScope, FinancialStatus, FinancialType, Prisma } from '@prisma/client';
import { PeriodLockService } from '../monthly-closings/period-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { QueryIncomesDto } from './dto/query-incomes.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';

@Injectable()
export class IncomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodLockService: PeriodLockService,
  ) {}

  async create(dto: CreateIncomeDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('O valor da receita deve ser estritamente maior que zero.');
    }

    const category = await this.prisma.financialCategory.findUnique({
      where: { id: dto.financialCategoryId },
    });

    if (!category) {
      throw new NotFoundException(`Categoria financeira com ID "${dto.financialCategoryId}" não foi encontrada.`);
    }

    if (category.type !== FinancialType.INCOME) {
      throw new BadRequestException(
        `A categoria "${category.name}" é do tipo EXPENSE. Para registrar uma receita, utilize uma categoria do tipo INCOME.`,
      );
    }

    if (!category.isActive) {
      throw new BadRequestException(`A categoria financeira "${category.name}" está inativa.`);
    }

    const status = dto.status ?? FinancialStatus.PAID;
    const incomeDate = dto.incomeDate ? new Date(dto.incomeDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      await this.periodLockService.lockAndAssertPeriodOpen(tx, incomeDate);

      return tx.income.create({
        data: {
          financialCategoryId: dto.financialCategoryId,
          description: dto.description.trim(),
          amount: new Prisma.Decimal(dto.amount),
          status,
          incomeDate,
          notes: dto.notes?.trim() ?? null,
        },
        include: {
          category: true,
        },
      });
    });
  }

  async findAll(query?: QueryIncomesDto) {
    const where: Prisma.IncomeWhereInput = {};

    if (query?.financialCategoryId) {
      where.financialCategoryId = query.financialCategoryId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.startDate || query?.endDate) {
      where.incomeDate = {};
      if (query.startDate) {
        where.incomeDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.incomeDate.lte = new Date(query.endDate);
      }
    }

    if (query?.scope) {
      where.category = {
        scope: query.scope,
      };
    }

    const items = await this.prisma.income.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { incomeDate: 'desc' },
    });

    let totalPending = new Prisma.Decimal(0);
    let totalPaid = new Prisma.Decimal(0);
    let totalCanceled = new Prisma.Decimal(0);
    let totalBusiness = new Prisma.Decimal(0);
    let totalPersonal = new Prisma.Decimal(0);

    for (const item of items) {
      if (item.status === FinancialStatus.PENDING) {
        totalPending = totalPending.plus(item.amount);
      } else if (item.status === FinancialStatus.PAID) {
        totalPaid = totalPaid.plus(item.amount);
      } else if (item.status === FinancialStatus.CANCELED) {
        totalCanceled = totalCanceled.plus(item.amount);
      }

      if (item.status !== FinancialStatus.CANCELED) {
        if (item.category.scope === FinancialScope.BUSINESS) {
          totalBusiness = totalBusiness.plus(item.amount);
        } else if (item.category.scope === FinancialScope.PERSONAL) {
          totalPersonal = totalPersonal.plus(item.amount);
        }
      }
    }

    return {
      data: items,
      summary: {
        totalPending: totalPending.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalCanceled: totalCanceled.toFixed(2),
        totalBusiness: totalBusiness.toFixed(2),
        totalPersonal: totalPersonal.toFixed(2),
      },
    };
  }

  async findOne(id: string) {
    const income = await this.prisma.income.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!income) {
      throw new NotFoundException(`Receita com ID "${id}" não foi encontrada.`);
    }

    return income;
  }

  async update(id: string, dto: UpdateIncomeDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM incomes WHERE id = ${id} FOR UPDATE`;

      const existing = await tx.income.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Receita com ID "${id}" não foi encontrada.`);
      }

      const targetDate = dto.incomeDate ? new Date(dto.incomeDate) : undefined;
      await this.periodLockService.lockAndAssertAllPeriodsOpen(tx, [existing.incomeDate, targetDate]);

      const updateData: Prisma.IncomeUpdateInput = {};

      if (dto.financialCategoryId) {
        const category = await tx.financialCategory.findUnique({
          where: { id: dto.financialCategoryId },
        });

        if (!category) {
          throw new NotFoundException(`Categoria financeira com ID "${dto.financialCategoryId}" não foi encontrada.`);
        }

        if (category.type !== FinancialType.INCOME) {
          throw new BadRequestException(
            `A categoria "${category.name}" é do tipo EXPENSE. Não é permitido associar categoria de despesa a uma receita.`,
          );
        }

        if (!category.isActive) {
          throw new BadRequestException(`A categoria financeira "${category.name}" está inativa.`);
        }

        updateData.category = { connect: { id: dto.financialCategoryId } };
      }

      if (dto.description !== undefined) {
        updateData.description = dto.description.trim();
      }

      if (dto.amount !== undefined) {
        if (dto.amount <= 0) {
          throw new BadRequestException('O valor da receita deve ser estritamente maior que zero.');
        }
        updateData.amount = new Prisma.Decimal(dto.amount);
      }

      if (dto.status !== undefined) {
        updateData.status = dto.status;
      }

      if (dto.incomeDate !== undefined) {
        updateData.incomeDate = new Date(dto.incomeDate);
      }

      if (dto.notes !== undefined) {
        updateData.notes = dto.notes ? dto.notes.trim() : null;
      }

      return tx.income.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
        },
      });
    });
  }
}
