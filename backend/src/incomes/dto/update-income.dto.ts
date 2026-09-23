import { FinancialStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class UpdateIncomeDto {
  @IsOptional()
  @IsUUID('4', { message: 'financialCategoryId deve ser um UUID válido.' })
  financialCategoryId?: string;

  @IsOptional()
  @IsString({ message: 'A descrição da receita deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição da receita não pode ser vazia.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor da receita deve ter no máximo 2 casas decimais.' })
  @IsPositive({ message: 'O valor da receita deve ser estritamente maior que zero.' })
  amount?: number;

  @IsOptional()
  @IsEnum(FinancialStatus, { message: 'Status deve ser PENDING, PAID ou CANCELED.' })
  status?: FinancialStatus;

  @IsOptional()
  @IsISO8601({}, { message: 'incomeDate deve ser uma data válida em formato ISO-8601.' })
  incomeDate?: string;

  @IsOptional()
  @IsString({ message: 'Observações devem ser em formato texto.' })
  notes?: string;
}
