import { IsNotEmpty, IsString, Length, Matches } from 'class-validator'

export class ProcessarChaveAcessoDto {
  @IsNotEmpty({ message: 'A chave de acesso é obrigatória' })
  @IsString({ message: 'A chave de acesso deve ser uma string' })
  @Length(44, 44, {
    message: 'A chave de acesso deve ter exatamente 44 dígitos',
  })
  @Matches(/^\d{44}$/, {
    message: 'A chave de acesso deve conter apenas dígitos numéricos',
  })
  chaveAcesso: string
}
