import { LoanStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLoanDto {
  @IsOptional()
  @IsString({ message: 'O nome do credor/instituição (lenderName) deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do credor/instituição não pode ser vazio.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  lenderName?: string;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsEnum(LoanStatus, { message: 'Status deve ser ACTIVE, PAID ou RENEGOTIATED.' })
  status?: LoanStatus;

  @IsOptional()
  @IsString({ message: 'notes deve ser um texto.' })
  notes?: string;
}
