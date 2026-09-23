import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLoanPaymentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount deve ser numérico com até 2 casas decimais.' })
  @Min(0.01, { message: 'amount deve ser maior que zero.' })
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amountPaid deve ser numérico com até 2 casas decimais.' })
  @Min(0.01, { message: 'amountPaid deve ser maior que zero.' })
  amountPaid?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'principalPaid deve ser numérico com até 2 casas decimais.' })
  @Min(0, { message: 'principalPaid deve ser maior ou igual a zero.' })
  principalPaid: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'interestPaid deve ser numérico com até 2 casas decimais.' })
  @Min(0, { message: 'interestPaid deve ser maior ou igual a zero.' })
  interestPaid: number;

  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido.' })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsISO8601({}, { message: 'paymentDate deve ser uma data válida em formato ISO-8601.' })
  paymentDate?: string;

  @IsOptional()
  @IsString({ message: 'notes deve ser um texto.' })
  notes?: string;
}
