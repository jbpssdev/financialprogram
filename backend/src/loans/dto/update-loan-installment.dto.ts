import { InstallmentStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateLoanInstallmentDto {
  @IsOptional()
  @IsISO8601({}, { message: 'dueDate deve ser uma data válida em formato ISO-8601.' })
  dueDate?: string;

  @IsOptional()
  @IsEnum(InstallmentStatus, { message: 'Status deve ser PENDING, PARTIALLY_PAID, PAID ou CANCELED.' })
  status?: InstallmentStatus;

  @IsOptional()
  @IsString({ message: 'notes deve ser um texto.' })
  notes?: string;
}
