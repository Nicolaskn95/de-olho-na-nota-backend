import { IsString, MinLength } from 'class-validator'

export class AdicionarVozDto {
  @IsString()
  @MinLength(1)
  textoFalado: string
}
