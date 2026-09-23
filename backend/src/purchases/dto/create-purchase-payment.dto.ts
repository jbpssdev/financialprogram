import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePurchasePaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor do pagamento deve ter no máximo 2 casas decimais' })
  @Min(0.01, { message: 'O valor do pagamento deve ser maior que zero' })
  amount: number;

  @IsEnum(PaymentMethod, { message: 'Forma de pagamento inválida. Use CASH, PIX, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER ou OTHER' })
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsDateString({}, { message: 'A data do pagamento deve estar no formato ISO válido' })
  @IsOptional()
  paymentDate?: string;

  @IsString({ message: 'As observações devem ser um texto' })
  @IsOptional()
  notes?: string;
}
