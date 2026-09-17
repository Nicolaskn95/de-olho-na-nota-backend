import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator'

export class FiltrarDuracaoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'mesInicial deve estar no formato YYYY-MM',
  })
  mesInicial: string

  @IsString()
  @IsNotEmpty()
  categoriaId: string

  @IsNumber()
  @Min(1)
  @Max(36)
  qtdMeses: number
}
