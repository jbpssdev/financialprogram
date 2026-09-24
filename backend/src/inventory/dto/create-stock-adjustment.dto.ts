import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export enum AllowedAdjustmentType {
  ADJUSTMENT_POSITIVE = 'ADJUSTMENT_POSITIVE',
  ADJUSTMENT_NEGATIVE = 'ADJUSTMENT_NEGATIVE',
  LOSS = 'LOSS',
  INTERNAL_CONSUMPTION = 'INTERNAL_CONSUMPTION',
}

export class CreateStockAdjustmentDto {
  @IsString({ message: 'O ID do produto deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O ID do produto é obrigatório.' })
  productId: string;

  @IsEnum(AllowedAdjustmentType, {
    message: 'O tipo de ajuste deve ser ADJUSTMENT_POSITIVE, ADJUSTMENT_NEGATIVE, LOSS ou INTERNAL_CONSUMPTION.',
  })
  type: AllowedAdjustmentType;

  @IsNumber({}, { message: 'A quantidade deve ser um número válido.' })
  @IsPositive({ message: 'A quantidade deve ser estritamente maior que zero.' })
  quantity: number;

  @IsString({ message: 'O motivo do ajuste deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O motivo do ajuste é obrigatório.' })
  @MinLength(3, { message: 'O motivo do ajuste deve ter no mínimo 3 caracteres.' })
  reason: string;

  @IsString({ message: 'As observações devem ser um texto válido.' })
  @IsOptional()
  notes?: string;
}
