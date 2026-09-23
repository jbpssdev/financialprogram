import { FinancialStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateExpenseDto {
  @IsUUID('4', { message: 'financialCategoryId deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'financialCategoryId é obrigatório.' })
  financialCategoryId: string;

  @IsString({ message: 'A descrição da despesa deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição da despesa é obrigatória.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor da despesa deve ter no máximo 2 casas decimais.' })
  @IsPositive({ message: 'O valor da despesa deve ser estritamente maior que zero.' })
  amount: number;

  @IsOptional()
  @IsEnum(FinancialStatus, { message: 'Status deve ser PENDING, PAID ou CANCELED.' })
  status?: FinancialStatus;

  @IsOptional()
  @IsISO8601({}, { message: 'dueDate deve ser uma data válida em formato ISO-8601.' })
  dueDate?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'paymentDate deve ser uma data válida em formato ISO-8601.' })
  paymentDate?: string;

  @IsOptional()
  @IsBoolean({ message: 'isRecurring deve ser um booleano.' })
  isRecurring?: boolean;

  @IsOptional()
  @IsString({ message: 'Observações devem ser em formato texto.' })
  notes?: string;
}
