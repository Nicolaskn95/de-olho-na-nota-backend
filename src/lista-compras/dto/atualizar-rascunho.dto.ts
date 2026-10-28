import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class ItemRascunhoDto {
  @IsString()
  termoFalado: string

  @IsNumber()
  @Min(0.01)
  quantidade: number

  @IsString()
  unidade: string

  @IsOptional()
  adicionadoEm?: Date | string
}

export class AtualizarRascunhoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemRascunhoDto)
  itens: ItemRascunhoDto[]
}
