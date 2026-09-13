import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator'

export class GerarListaDto {
  @IsString()
  cnpj: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  periodoMeses?: number
}
