import { IsArray, IsString, IsOptional } from 'class-validator'

export class ClassificarProdutosIaDto {
  @IsOptional()
  @IsString()
  notaFiscalId?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  produtos?: string[]
}
