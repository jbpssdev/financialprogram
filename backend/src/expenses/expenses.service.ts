import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialScope, FinancialStatus, FinancialType, Prisma } from '@prisma/client';
import { PeriodLockService } from '../monthly-closings/period-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelExpenseDto } from './dto/cancel-expense.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodLockService: PeriodLockService,
  ) {}

  async create(dto: CreateExpenseDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('O valor da despesa deve ser estritamente maior que zero.');
    }

    const category = await this.prisma.financialCategory.findUnique({
      where: { id: dto.financialCategoryId },
    });

    if (!category) {
      throw new NotFoundException(`Categoria financeira com ID "${dto.financialCategoryId}" não foi encontrada.`);
    }

    if (category.type !== FinancialType.EXPENSE) {
      throw new BadRequestException(
        `A categoria "${category.name}" é do tipo INCOME. Para registrar uma despesa, utilize uma categoria do tipo EXPENSE.`,
      );
    }

    if (!category.isActive) {
      throw new BadRequestException(`A categoria financeira "${category.name}" está inativa.`);
    }

    // Determine status and validate paymentDate coherence
    const status = dto.status ?? (dto.paymentDate ? FinancialStatus.PAID : FinancialStatus.PENDING);

    if (status === FinancialStatus.PAID && !dto.paymentDate) {
      throw new BadRequestException('Data de pagamento (paymentDate) é obrigatória para despesas com status PAID.');
    }

    if (status === FinancialStatus.PENDING && dto.paymentDate) {
      throw new BadRequestException('Despesa com status PENDING não deve ter data de pagamento (paymentDate).');
    }

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    const paymentDate = status === FinancialStatus.PAID && dto.paymentDate ? new Date(dto.paymentDate) : null;

    return this.prisma.$transaction(async (tx) => {
      if (status === FinancialStatus.PAID && paymentDate) {
        await this.periodLockService.lockAndAssertPeriodOpen(tx, paymentDate);
      }

      return tx.expense.create({
        data: {
          financialCategoryId: dto.financialCategoryId,
          description: dto.description.trim(),
          amount: new Prisma.Decimal(dto.amount),
          status,
          dueDate,
          paymentDate,
          isRecurring: dto.isRecurring ?? false,
          notes: dto.notes?.trim() ?? null,
        },
        include: {
          category: true,
        },
      });
    });
  }

  async findAll(query?: QueryExpensesDto) {
    const where: Prisma.ExpenseWhereInput = {};

    if (query?.financialCategoryId) {
      where.financialCategoryId = query.financialCategoryId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.scope) {
      where.category = {
        scope: query.scope,
      };
    }

    if (query?.isRecurring !== undefined) {
      where.isRecurring = query.isRecurring;
    }

    if (query?.startDate || query?.endDate) {
      const dateFilter: Prisma.DateTimeNullableFilter = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.lte = new Date(query.endDate);
      }

      where.OR = [
        { paymentDate: dateFilter },
        { paymentDate: null, dueDate: dateFilter },
      ];
    }

    const items = await this.prisma.expense.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
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
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Despesa com ID "${id}" não foi encontrada.`);
    }

    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM expenses WHERE id = ${id} FOR UPDATE`;

      const existing = await tx.expense.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Despesa com ID "${id}" não foi encontrada.`);
      }

      // 1. Regra para registro CANCELED: imutável e sem reativação
      if (existing.status === FinancialStatus.CANCELED) {
        throw new BadRequestException('Não é permitido alterar uma despesa cancelada.');
      }

      // 2. Não permitir transicionar diretamente para CANCELED via PATCH (deve usar /cancel com justificativa)
      if (dto.status === FinancialStatus.CANCELED) {
        throw new BadRequestException(
          'Para cancelar uma despesa, utilize o endpoint dedicado POST /api/v1/expenses/:id/cancel informando o motivo.',
        );
      }

      // 3. Regra para registro PAID (realizado): campos de desembolso financeiro são imutáveis
      if (existing.status === FinancialStatus.PAID) {
        if (dto.status === FinancialStatus.PENDING) {
          throw new BadRequestException('Não é permitido reverter uma despesa paga (PAID) para pendente (PENDING).');
        }

        if (dto.amount !== undefined && !new Prisma.Decimal(dto.amount).equals(existing.amount)) {
          throw new BadRequestException(
            'Não é permitido alterar o valor de uma despesa já paga (PAID). Cancele o lançamento e registre um novo.',
          );
        }

        if (
          dto.paymentDate !== undefined &&
          existing.paymentDate &&
          new Date(dto.paymentDate).getTime() !== existing.paymentDate.getTime()
        ) {
          throw new BadRequestException(
            'Não é permitido alterar a data de pagamento de uma despesa já paga (PAID). Cancele o lançamento e registre um novo.',
          );
        }

        if (dto.financialCategoryId !== undefined && dto.financialCategoryId !== existing.financialCategoryId) {
          throw new BadRequestException(
            'Não é permitido alterar a categoria de uma despesa já paga (PAID). Cancele o lançamento e registre um novo.',
          );
        }

        // Para alteração de campos não financeiros de despesa paga, valida que o período original do pagamento está aberto
        if (existing.paymentDate) {
          await this.periodLockService.lockAndAssertPeriodOpen(tx, existing.paymentDate);
        }
      }

      // 4. Regra para registro PENDING: permite edição e transição para PAID exigindo paymentDate
      if (existing.status === FinancialStatus.PENDING) {
        if (dto.status === FinancialStatus.PAID) {
          const resultingPaymentDate = dto.paymentDate ? new Date(dto.paymentDate) : null;
          if (!resultingPaymentDate) {
            throw new BadRequestException('Data de pagamento (paymentDate) é obrigatória para despesas com status PAID.');
          }
          await this.periodLockService.lockAndAssertPeriodOpen(tx, resultingPaymentDate);
        }
      }

      const updateData: Prisma.ExpenseUpdateInput = {};

      if (dto.financialCategoryId && existing.status !== FinancialStatus.PAID) {
        const category = await tx.financialCategory.findUnique({
          where: { id: dto.financialCategoryId },
        });

        if (!category) {
          throw new NotFoundException(`Categoria financeira com ID "${dto.financialCategoryId}" não foi encontrada.`);
        }

        if (category.type !== FinancialType.EXPENSE) {
          throw new BadRequestException(
            `A categoria "${category.name}" é do tipo INCOME. Não é permitido associar categoria de receita a uma despesa.`,
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
          throw new BadRequestException('O valor da despesa deve ser estritamente maior que zero.');
        }
        updateData.amount = new Prisma.Decimal(dto.amount);
      }

      if (dto.dueDate !== undefined) {
        updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      }

      if (dto.isRecurring !== undefined) {
        updateData.isRecurring = dto.isRecurring;
      }

      if (dto.notes !== undefined) {
        updateData.notes = dto.notes ? dto.notes.trim() : null;
      }

      if (dto.status !== undefined) {
        updateData.status = dto.status;
      }

      if (dto.paymentDate !== undefined && existing.status !== FinancialStatus.PAID) {
        updateData.paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : null;
      }

      return tx.expense.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
        },
      });
    });
  }

  async cancel(id: string, dto: CancelExpenseDto) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('O motivo do cancelamento é obrigatório.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM expenses WHERE id = ${id} FOR UPDATE`;

      const existing = await tx.expense.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Despesa com ID "${id}" não foi encontrada.`);
      }

      if (existing.status === FinancialStatus.CANCELED) {
        throw new BadRequestException('Esta despesa já se encontra cancelada.');
      }

      // Regra de Period Lock:
      // Se a despesa era PAID, ela impactou o caixa/DRE na competência do paymentDate original;
      // portanto, o estorno exige que o paymentDate original esteja aberto.
      // Se a despesa era PENDING, trata-se de cancelamento de previsão/compromisso não realizado;
      // logo, não afeta períodos contábeis fechados.
      if (existing.status === FinancialStatus.PAID && existing.paymentDate) {
        await this.periodLockService.lockAndAssertPeriodOpen(tx, existing.paymentDate);
      }

      return tx.expense.update({
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
