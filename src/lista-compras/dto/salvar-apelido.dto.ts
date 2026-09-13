import { IsString, MinLength } from 'class-validator'

export class SalvarApelidoDto {
  @IsString()
  @MinLength(1)
  nomeOriginal: string

  @IsString()
  @MinLength(1)
  apelido: string
}
