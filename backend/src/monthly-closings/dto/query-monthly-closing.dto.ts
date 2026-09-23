import { ClosingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryMonthlyClosingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  @Min(2000, { message: 'Ano mínimo é 2000.' })
  @Max(2100, { message: 'Ano máximo é 2100.' })
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O mês deve ser entre 1 e 12.' })
  @Min(1, { message: 'Mês mínimo é 1.' })
  @Max(12, { message: 'Mês máximo é 12.' })
  month?: number;

  @IsOptional()
  @IsEnum(ClosingStatus, { message: 'Status deve ser OFFICIAL ou SUPERSEDED.' })
  status?: ClosingStatus;
}
