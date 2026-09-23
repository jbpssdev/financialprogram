import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { QueryFinancialCategoriesDto } from './dto/query-financial-categories.dto';
import { UpdateFinancialCategoryDto } from './dto/update-financial-category.dto';

@Injectable()
export class FinancialCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFinancialCategoryDto) {
    const trimmedName = dto.name.trim();
    const scope = dto.scope ?? FinancialScope.BUSINESS;

    const existing = await this.prisma.financialCategory.findUnique({
      where: {
        name_type_scope: {
          name: trimmedName,
          type: dto.type,
          scope,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe uma categoria financeira com o nome "${trimmedName}", tipo "${dto.type}" e escopo "${scope}".`,
      );
    }

    return this.prisma.financialCategory.create({
      data: {
        name: trimmedName,
        type: dto.type,
        scope,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(query?: QueryFinancialCategoriesDto) {
    const where: Prisma.FinancialCategoryWhereInput = {};

    if (query?.type) {
      where.type = query.type;
    }

    if (query?.scope) {
      where.scope = query.scope;
    }

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.financialCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            incomes: true,
            expenses: true,
          },
        },
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.financialCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            incomes: true,
            expenses: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoria financeira com ID "${id}" não foi encontrada.`);
    }

    return category;
  }

  async update(id: string, dto: UpdateFinancialCategoryDto) {
    const existing = await this.findOne(id);

    const updateData: Prisma.FinancialCategoryUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      const conflict = await this.prisma.financialCategory.findUnique({
        where: {
          name_type_scope: {
            name: trimmedName,
            type: existing.type,
            scope: existing.scope,
          },
        },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Já existe uma categoria financeira com o nome "${trimmedName}", tipo "${existing.type}" e escopo "${existing.scope}".`,
        );
      }

      updateData.name = trimmedName;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return this.prisma.financialCategory.update({
      where: { id },
      data: updateData,
    });
  }
}
