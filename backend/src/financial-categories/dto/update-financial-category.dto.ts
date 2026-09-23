import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFinancialCategoryDto {
  @IsOptional()
  @IsString({ message: 'O nome da categoria financeira deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da categoria financeira não pode ser vazio.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive deve ser um booleano.' })
  isActive?: boolean;
}
