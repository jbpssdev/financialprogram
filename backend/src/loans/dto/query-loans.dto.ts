import { LoanStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class QueryLoansDto {
  @IsOptional()
  @IsEnum(LoanStatus, { message: 'Status deve ser ACTIVE, PAID ou RENEGOTIATED.' })
  status?: LoanStatus;

  @IsOptional()
  @IsISO8601({}, { message: 'startDate deve ser uma data válida em formato ISO-8601.' })
  startDate?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'endDate deve ser uma data válida em formato ISO-8601.' })
  endDate?: string;
}
