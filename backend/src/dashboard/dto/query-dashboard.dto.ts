import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class QueryDashboardDto {
  @Type(() => Number)
  @IsInt({ message: 'year deve ser um número inteiro.' })
  @Min(2000, { message: 'year deve ser maior ou igual a 2000.' })
  @Max(2100, { message: 'year deve ser menor ou igual a 2100.' })
  year: number;

  @Type(() => Number)
  @IsInt({ message: 'month deve ser um número inteiro.' })
  @Min(1, { message: 'month deve estar entre 1 e 12.' })
  @Max(12, { message: 'month deve estar entre 1 e 12.' })
  month: number;
}
