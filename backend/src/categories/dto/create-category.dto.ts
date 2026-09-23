import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'O nome da categoria deve ser um texto' })
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório e não pode ser vazio' })
  name: string;

  @IsString({ message: 'A descrição da categoria deve ser um texto' })
  @IsOptional()
  description?: string;
}
