import { PaymentMethod, SaleStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class QuerySalesDto {
  @IsDateString({}, { message: 'startDate deve ser uma data válida no formato ISO' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'endDate deve ser uma data válida no formato ISO' })
  @IsOptional()
  endDate?: string;

  @IsEnum(SaleStatus, { message: 'status deve ser COMPLETED ou CANCELED' })
  @IsOptional()
  status?: SaleStatus;

  @IsEnum(PaymentMethod, {
    message: 'Forma de pagamento inválida. Use CASH, PIX, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER ou OTHER',
  })
  @IsOptional()
  paymentMethod?: PaymentMethod;
}
