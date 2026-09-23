import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @IsString({ message: 'O nome da categoria deve ser um texto' })
  @IsNotEmpty({ message: 'O nome da categoria não pode ser vazio' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'A descrição da categoria deve ser um texto' })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: 'O status isActive deve ser booleano' })
  @IsOptional()
  isActive?: boolean;
}
