import { Transform, Type } from 'class-transformer';
import { IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateLoanDto {
  @IsString({ message: 'O nome do credor/instituição (lenderName) deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do credor/instituição (lenderName) é obrigatório.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  lenderName: string;

  @IsOptional()
  @IsString({ message: 'A descrição/finalidade do empréstimo deve ser um texto.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'principalAmount deve ser numérico com até 2 casas decimais.' })
  @IsPositive({ message: 'principalAmount deve ser estritamente maior que zero.' })
  principalAmount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'totalPayable deve ser numérico com até 2 casas decimais.' })
  @IsPositive({ message: 'totalPayable deve ser maior que zero.' })
  totalPayable?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'installments deve ser um número inteiro.' })
  @Min(1, { message: 'O número de parcelas deve ser de pelo menos 1.' })
  installments?: number;

  @IsOptional()
  @IsISO8601({}, { message: 'startDate deve ser uma data válida em formato ISO-8601.' })
  startDate?: string;

  @IsOptional()
  @IsString({ message: 'notes deve ser um texto.' })
  notes?: string;
}
