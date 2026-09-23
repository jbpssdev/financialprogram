import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateSaleItemDto } from './create-sale-item.dto';

export class CreateSaleDto {
  @IsDateString({}, { message: 'saleDate deve ser uma data válida no formato ISO' })
  @IsOptional()
  saleDate?: string;

  @IsEnum(PaymentMethod, {
    message: 'Forma de pagamento inválida. Use CASH, PIX, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER ou OTHER',
  })
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O desconto deve ter no máximo 2 casas decimais' })
  @Min(0, { message: 'O desconto não pode ser negativo' })
  @IsOptional()
  discount?: number;

  @IsString({ message: 'As observações devem ser um texto' })
  @IsOptional()
  notes?: string;

  @IsArray({ message: 'items deve ser uma lista de itens vendidos' })
  @ArrayMinSize(1, { message: 'A venda deve conter pelo menos um item' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
