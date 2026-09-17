import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string

  @IsBoolean()
  @IsOptional()
  remember?: boolean
}
