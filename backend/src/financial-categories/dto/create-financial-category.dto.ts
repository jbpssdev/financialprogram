import { FinancialScope, FinancialType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFinancialCategoryDto {
  @IsString({ message: 'O nome da categoria financeira deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da categoria financeira é obrigatório.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsEnum(FinancialType, { message: 'O tipo da categoria financeira deve ser INCOME ou EXPENSE.' })
  type: FinancialType;

  @IsOptional()
  @IsEnum(FinancialScope, { message: 'O escopo da categoria financeira deve ser BUSINESS ou PERSONAL.' })
  scope?: FinancialScope;

  @IsOptional()
  @IsBoolean({ message: 'isActive deve ser um booleano.' })
  isActive?: boolean;
}
