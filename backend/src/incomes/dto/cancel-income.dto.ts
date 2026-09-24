import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelIncomeDto {
  @IsString({ message: 'O motivo do cancelamento deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O motivo do cancelamento é obrigatório.' })
  @MinLength(3, { message: 'O motivo do cancelamento deve ter no mínimo 3 caracteres.' })
  reason: string;
}
