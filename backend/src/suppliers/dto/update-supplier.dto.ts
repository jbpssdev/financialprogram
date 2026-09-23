import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSupplierDto {
  @IsString({ message: 'O nome do fornecedor deve ser um texto' })
  @IsNotEmpty({ message: 'O nome do fornecedor não pode ser vazio' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'O nome do contato deve ser um texto' })
  @IsOptional()
  contactName?: string;

  @IsString({ message: 'O telefone deve ser um texto' })
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'O e-mail informado é inválido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'As observações devem ser um texto' })
  @IsOptional()
  notes?: string;

  @IsBoolean({ message: 'O status isActive deve ser booleano' })
  @IsOptional()
  isActive?: boolean;
}
