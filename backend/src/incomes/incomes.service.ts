import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialScope, FinancialStatus, FinancialType, Prisma } from '@prisma/client';
import { PeriodLockService } from '../monthly-closings/period-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelIncomeDto } from './dto/cancel-income.dto';
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

      // 1. Regra para registro CANCELED: imutável e sem reativação
      if (existing.status === FinancialStatus.CANCELED) {
        throw new BadRequestException('Não é permitido alterar uma receita cancelada.');
      }

      // 2. Não permitir transicionar diretamente para CANCELED via PATCH (deve usar /cancel com justificativa)
      if (dto.status === FinancialStatus.CANCELED) {
        throw new BadRequestException(
          'Para cancelar uma receita, utilize o endpoint dedicado POST /api/v1/incomes/:id/cancel informando o motivo.',
        );
      }

      // 3. Regra para registro PAID (realizado): campos financeiros são imutáveis
      if (existing.status === FinancialStatus.PAID) {
        if (dto.status === FinancialStatus.PENDING) {
          throw new BadRequestException('Não é permitido reverter uma receita realizada (PAID) para pendente (PENDING).');
        }

        if (dto.amount !== undefined && !new Prisma.Decimal(dto.amount).equals(existing.amount)) {
          throw new BadRequestException(
            'Não é permitido alterar o valor de uma receita já realizada (PAID). Cancele o lançamento e registre um novo.',
          );
        }

        if (dto.incomeDate !== undefined && new Date(dto.incomeDate).getTime() !== existing.incomeDate.getTime()) {
          throw new BadRequestException(
            'Não é permitido alterar a data de uma receita já realizada (PAID). Cancele o lançamento e registre um novo.',
          );
        }

        if (dto.financialCategoryId !== undefined && dto.financialCategoryId !== existing.financialCategoryId) {
          throw new BadRequestException(
            'Não é permitido alterar a categoria de uma receita já realizada (PAID). Cancele o lançamento e registre um novo.',
          );
        }

        // Para alteração de campos não financeiros de receita realizada em período fechado,
        // valida que o período original está aberto
        await this.periodLockService.lockAndAssertPeriodOpen(tx, existing.incomeDate);
      }

      // 4. Regra para registro PENDING: permite edição e transição para PAID
      if (existing.status === FinancialStatus.PENDING) {
        if (dto.status === FinancialStatus.PAID) {
          const resultingDate = dto.incomeDate ? new Date(dto.incomeDate) : existing.incomeDate;
          await this.periodLockService.lockAndAssertPeriodOpen(tx, resultingDate);
        }
      }

      const updateData: Prisma.IncomeUpdateInput = {};

      if (dto.financialCategoryId && existing.status !== FinancialStatus.PAID) {
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

      if (dto.amount !== undefined && existing.status !== FinancialStatus.PAID) {
        if (dto.amount <= 0) {
          throw new BadRequestException('O valor da receita deve ser estritamente maior que zero.');
        }
        updateData.amount = new Prisma.Decimal(dto.amount);
      }

      if (dto.status !== undefined) {
        updateData.status = dto.status;
      }

      if (dto.incomeDate !== undefined && existing.status !== FinancialStatus.PAID) {
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

  async cancel(id: string, dto: CancelIncomeDto) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('O motivo do cancelamento é obrigatório.');
    }

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

      if (existing.status === FinancialStatus.CANCELED) {
        throw new BadRequestException('Esta receita já se encontra cancelada.');
      }

      // Proteger o período contábil do incomeDate original
      await this.periodLockService.lockAndAssertPeriodOpen(tx, existing.incomeDate);

      return tx.income.update({
        where: { id },
        data: {
          status: FinancialStatus.CANCELED,
          canceledAt: new Date(),
          cancellationReason: dto.reason.trim(),
        },
        include: {
          category: true,
        },
      });
    });
  }
}
