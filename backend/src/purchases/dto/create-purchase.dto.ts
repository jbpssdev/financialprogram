import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreatePurchaseItemDto } from './create-purchase-item.dto';
import { CreatePurchasePaymentDto } from './create-purchase-payment.dto';

export class CreatePurchaseDto {
  @IsUUID('4', { message: 'supplierId deve ser um UUID válido' })
  @IsOptional()
  supplierId?: string;

  @IsDateString({}, { message: 'purchaseDate deve ser uma data válida no formato ISO' })
  @IsOptional()
  purchaseDate?: string;

  @IsString({ message: 'As observações devem ser um texto' })
  @IsOptional()
  notes?: string;

  @IsArray({ message: 'items deve ser uma lista de itens comprados' })
  @ArrayMinSize(1, { message: 'A compra deve conter pelo menos um item' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePurchasePaymentDto)
  initialPayment?: CreatePurchasePaymentDto;
}
