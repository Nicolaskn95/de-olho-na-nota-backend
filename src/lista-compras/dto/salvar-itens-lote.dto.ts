import { IsArray, ValidateNested, IsNumber, IsBoolean, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ItemLoteDto {
  @IsNumber()
  @Min(0)
  index: number

  @IsBoolean()
  comprado: boolean
}

export class SalvarItensLoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemLoteDto)
  itens: ItemLoteDto[]
}
