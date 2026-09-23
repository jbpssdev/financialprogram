import { IsNotEmpty, IsString } from 'class-validator';

export class CancelSaleDto {
  @IsString({ message: 'O motivo do cancelamento deve ser um texto' })
  @IsNotEmpty({ message: 'O motivo do cancelamento é obrigatório' })
  reason: string;
}
