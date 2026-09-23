import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateMonthlyClosingDto {
  @Type(() => Number)
  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  @Min(2000, { message: 'Ano mínimo permitido é 2000.' })
  @Max(2100, { message: 'Ano máximo permitido é 2100.' })
  year: number;

  @Type(() => Number)
  @IsInt({ message: 'O mês deve ser um número inteiro entre 1 e 12.' })
  @Min(1, { message: 'O mês deve ser no mínimo 1 (Janeiro).' })
  @Max(12, { message: 'O mês deve ser no máximo 12 (Dezembro).' })
  month: number;

  @IsOptional()
  @IsString({ message: 'Observações devem ser em formato texto.' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'O motivo de reabertura/refechamento deve ser um texto.' })
  reopenReason?: string;
}
