import { FinancialScope, FinancialStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class QueryExpensesDto {
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

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean({ message: 'isRecurring deve ser um booleano.' })
  isRecurring?: boolean;
}
