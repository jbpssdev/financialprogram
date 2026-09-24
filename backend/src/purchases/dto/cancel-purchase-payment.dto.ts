import { IsNotEmpty, IsString } from 'class-validator';

export class CancelPurchasePaymentDto {
  @IsString({ message: 'O motivo do cancelamento deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O motivo do cancelamento é obrigatório.' })
  reason: string;
}
