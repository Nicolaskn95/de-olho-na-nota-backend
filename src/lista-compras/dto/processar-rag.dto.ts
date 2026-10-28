import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class ProcessarRagDto {
  @IsString()
  cnpj: string

  @IsOptional()
  @IsBoolean()
  incluirSugestoesRecorrentes?: boolean

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  periodoMeses?: number
}
