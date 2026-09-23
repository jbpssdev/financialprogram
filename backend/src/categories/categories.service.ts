import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const trimmedName = dto.name.trim();

    const existing = await this.prisma.category.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      throw new ConflictException(`Já existe uma categoria cadastrada com o nome "${trimmedName}".`);
    }

    return this.prisma.category.create({
      data: {
        name: trimmedName,
        description: dto.description?.trim(),
      },
    });
  }

  async findAll(activeOnly = false) {
    return this.prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoria com ID "${id}" não foi encontrada.`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    const updateData: { name?: string; description?: string | null; isActive?: boolean } = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      const existingWithName = await this.prisma.category.findUnique({
        where: { name: trimmedName },
      });

      if (existingWithName && existingWithName.id !== id) {
        throw new ConflictException(`Já existe outra categoria com o nome "${trimmedName}".`);
      }

      updateData.name = trimmedName;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description ? dto.description.trim() : null;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return this.prisma.category.update({
      where: { id },
      data: updateData,
    });
  }
}
