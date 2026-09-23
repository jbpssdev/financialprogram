import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelLoanPaymentDto {
  @IsString({ message: 'O motivo do cancelamento deve ser um texto.' })
  @IsNotEmpty({ message: 'O motivo do cancelamento (reason) é obrigatório.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  reason: string;
}
