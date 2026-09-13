import { IsBoolean } from 'class-validator'

export class MarcarItemDto {
  @IsBoolean()
  comprado: boolean
}
