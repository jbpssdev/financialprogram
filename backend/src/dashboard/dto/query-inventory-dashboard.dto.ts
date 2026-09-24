import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class QueryInventoryDashboardDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'lowStockLimit deve ser um número.' })
  @Min(0, { message: 'lowStockLimit não pode ser negativo.' })
  @Max(100000, { message: 'lowStockLimit excede o limite máximo permitido.' })
  lowStockLimit?: number;
}
