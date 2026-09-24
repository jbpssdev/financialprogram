import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ReopenMonthlyClosingDto {
  @IsString({ message: 'O motivo da reabertura deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O motivo da reabertura é obrigatório.' })
  @MinLength(3, { message: 'O motivo da reabertura deve ter no mínimo 3 caracteres.' })
  reason: string;
}
