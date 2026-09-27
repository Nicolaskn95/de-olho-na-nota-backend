import { IsOptional, IsString, IsNumber, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class TributosDetalhadosDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  federal?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  estadual?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  municipal?: number
}

export class AtualizarNotaFiscalDto {
  @IsOptional()
  @IsString()
  tipoPagamento?: string

  @IsOptional()
  @IsString()
  cartaoUsado?: string

  @IsOptional()
  @IsString()
  formaPagamento?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorTributos?: number

  @IsOptional()
  @ValidateNested()
  @Type(() => TributosDetalhadosDto)
  tributosDetalhados?: TributosDetalhadosDto
}
