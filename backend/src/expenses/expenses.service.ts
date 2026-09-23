import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialScope, FinancialStatus, FinancialType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.expense.create({
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
    const existing = await this.findOne(id);

    const updateData: Prisma.ExpenseUpdateInput = {};

    if (dto.financialCategoryId) {
      const category = await this.prisma.financialCategory.findUnique({
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

    if (dto.amount !== undefined) {
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

    // Coherent resolution of status and paymentDate
    const resultingStatus = dto.status ?? existing.status;
    let resultingPaymentDate: Date | null;

    if (dto.paymentDate !== undefined) {
      resultingPaymentDate = dto.paymentDate ? new Date(dto.paymentDate) : null;
    } else if (dto.status === FinancialStatus.PENDING) {
      // Transitioning to PENDING clears payment date
      resultingPaymentDate = null;
    } else if (dto.status === FinancialStatus.CANCELED) {
      resultingPaymentDate = null;
    } else {
      resultingPaymentDate = existing.paymentDate;
    }

    if (resultingStatus === FinancialStatus.PAID && !resultingPaymentDate) {
      throw new BadRequestException('Data de pagamento (paymentDate) é obrigatória para despesas com status PAID.');
    }

    if (resultingStatus === FinancialStatus.PENDING && resultingPaymentDate && dto.paymentDate) {
      throw new BadRequestException('Despesa com status PENDING não deve ter data de pagamento (paymentDate).');
    }

    updateData.status = resultingStatus;
    updateData.paymentDate = resultingStatus === FinancialStatus.PAID ? resultingPaymentDate : null;

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
  }
}
