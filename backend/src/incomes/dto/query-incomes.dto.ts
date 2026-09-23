import { FinancialScope, FinancialStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class QueryIncomesDto {
  @IsOptional()
  @IsISO8601({}, { message: 'startDate deve ser uma data válida em formato ISO-8601.' })
  startDate?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'endDate deve ser uma data válida em formato ISO-8601.' })
  endDate?: string;

  @IsOptional()
  @IsEnum(FinancialStatus, { message: 'Status deve ser PENDING, PAID ou CANCELED.' })
  status?: FinancialStatus;

  @IsOptional()
  @IsUUID('4', { message: 'financialCategoryId deve ser um UUID válido.' })
  financialCategoryId?: string;

  @IsOptional()
  @IsEnum(FinancialScope, { message: 'Scope deve ser BUSINESS ou PERSONAL.' })
  scope?: FinancialScope;
}
