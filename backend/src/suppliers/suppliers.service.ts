import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        name: dto.name.trim(),
        contactName: dto.contactName?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        notes: dto.notes?.trim(),
      },
    });
  }

  async findAll(activeOnly = false) {
    return this.prisma.supplier.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Fornecedor com ID "${id}" não foi encontrado.`);
    }

    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        contactName: dto.contactName !== undefined ? (dto.contactName ? dto.contactName.trim() : null) : undefined,
        phone: dto.phone !== undefined ? (dto.phone ? dto.phone.trim() : null) : undefined,
        email: dto.email !== undefined ? (dto.email ? dto.email.trim().toLowerCase() : null) : undefined,
        notes: dto.notes !== undefined ? (dto.notes ? dto.notes.trim() : null) : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });
  }
}
