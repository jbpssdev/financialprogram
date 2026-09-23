import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateSaleItemDto {
  @IsUUID('4', { message: 'productId deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do produto é obrigatório' })
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'A quantidade deve ter no máximo 3 casas decimais' })
  @Min(0.001, { message: 'A quantidade vendida deve ser maior que zero' })
  quantity: number;
}
