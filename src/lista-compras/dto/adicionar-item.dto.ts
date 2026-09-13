import { IsString, IsNumber, IsOptional, Min } from 'class-validator'

export class AdicionarItemDto {
  @IsString()
  nome: string

  @IsNumber()
  @Min(0.01)
  quantidade: number

  @IsString()
  unidade: string

  @IsOptional()
  @IsNumber()
  valorEstimado?: number
}
