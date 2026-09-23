import { FinancialScope, FinancialType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class QueryFinancialCategoriesDto {
  @IsOptional()
  @IsEnum(FinancialType, { message: 'O tipo deve ser INCOME ou EXPENSE.' })
  type?: FinancialType;

  @IsOptional()
  @IsEnum(FinancialScope, { message: 'O escopo deve ser BUSINESS ou PERSONAL.' })
  scope?: FinancialScope;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean({ message: 'isActive deve ser um booleano.' })
  isActive?: boolean;
}
