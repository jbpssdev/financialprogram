import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Categoria com ID "${dto.categoryId}" não foi encontrada.`);
    }

    if (!category.isActive) {
      throw new BadRequestException(`Não é possível vincular um produto a uma categoria inativa.`);
    }

    const priceDecimal = new Prisma.Decimal(dto.currentPrice);

    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        type: dto.type,
        unitOfMeasure: dto.unitOfMeasure,
        currentPrice: priceDecimal,
        averageCost: new Prisma.Decimal(0),
        currentStock: new Prisma.Decimal(0),
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(activeOnly = false) {
    return this.prisma.product.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        priceHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Produto com ID "${id}" não foi encontrado.`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(`Categoria com ID "${dto.categoryId}" não foi encontrada.`);
      }

      if (!category.isActive) {
        throw new BadRequestException(`Não é possível mover o produto para uma categoria inativa.`);
      }
    }

    const newPriceDecimal =
      dto.currentPrice !== undefined ? new Prisma.Decimal(dto.currentPrice) : undefined;

    const isPriceChanged =
      newPriceDecimal !== undefined && !newPriceDecimal.equals(existing.currentPrice);

    if (isPriceChanged) {
      return this.prisma.$transaction(async (tx) => {
        // Record price history
        await tx.priceHistory.create({
          data: {
            productId: id,
            oldPrice: existing.currentPrice,
            newPrice: newPriceDecimal,
            averageCost: existing.averageCost,
          },
        });

        // Update product
        return tx.product.update({
          where: { id },
          data: {
            categoryId: dto.categoryId,
            name: dto.name !== undefined ? dto.name.trim() : undefined,
            description: dto.description !== undefined ? (dto.description ? dto.description.trim() : null) : undefined,
            type: dto.type,
            unitOfMeasure: dto.unitOfMeasure,
            currentPrice: newPriceDecimal,
            isActive: dto.isActive,
          },
          include: {
            category: true,
          },
        });
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? (dto.description ? dto.description.trim() : null) : undefined,
        type: dto.type,
        unitOfMeasure: dto.unitOfMeasure,
        isActive: dto.isActive,
      },
      include: {
        category: true,
      },
    });
  }
}
