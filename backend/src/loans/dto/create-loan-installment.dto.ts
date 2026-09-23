import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLoanInstallmentDto {
  @Type(() => Number)
  @IsInt({ message: 'installmentNumber deve ser um número inteiro.' })
  @Min(1, { message: 'installmentNumber deve ser no mínimo 1.' })
  installmentNumber: number;

  @IsISO8601({}, { message: 'dueDate deve ser uma data válida em formato ISO-8601.' })
  dueDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'principalExpected deve ser numérico com até 2 casas decimais.' })
  @Min(0, { message: 'principalExpected deve ser maior ou igual a zero.' })
  principalExpected: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'interestExpected deve ser numérico com até 2 casas decimais.' })
  @Min(0, { message: 'interestExpected deve ser maior ou igual a zero.' })
  interestExpected?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'expectedAmount deve ser numérico com até 2 casas decimais.' })
  @Min(0.01, { message: 'expectedAmount deve ser maior que zero.' })
  expectedAmount?: number;

  @IsOptional()
  @IsString({ message: 'notes deve ser um texto.' })
  notes?: string;
}
