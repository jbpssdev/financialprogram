import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsString({ message: 'O refresh token deve ser uma string válida.' })
  @IsNotEmpty({ message: 'O refresh token é obrigatório.' })
  refreshToken: string;
}
