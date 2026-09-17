import {
  IsArray,
  ArrayMinSize,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator'

export class CalcularDuracaoDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  produtoIds: string[]

  @IsNumber()
  @Min(1)
  @Max(36)
  qtdMeses: number
}
