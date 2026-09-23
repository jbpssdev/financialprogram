import { ItemType, UnitOfMeasure } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @IsUUID('4', { message: 'categoryId deve ser um UUID válido' })
  @IsNotEmpty({ message: 'A categoria do produto é obrigatória' })
  categoryId: string;

  @IsString({ message: 'O nome do produto deve ser um texto' })
  @IsNotEmpty({ message: 'O nome do produto é obrigatório' })
  name: string;

  @IsString({ message: 'A descrição deve ser um texto' })
  @IsOptional()
  description?: string;

  @IsEnum(ItemType, { message: 'Tipo de item inválido. Use PRODUCT_STOCK, TOKEN_QUANTITY ou SERVICE' })
  @IsOptional()
  type?: ItemType;

  @IsEnum(UnitOfMeasure, { message: 'Unidade de medida inválida. Use UNIT, KG, LITER, PACK, BOX ou TOKEN' })
  @IsOptional()
  unitOfMeasure?: UnitOfMeasure;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'currentPrice deve ser um número válido com até 2 casas decimais' })
  @Min(0, { message: 'O preço de venda não pode ser negativo' })
  currentPrice: number;
}
