export interface EnderecoMercadoDto {
  rua?: string
  numero?: string
  bairro?: string
  cidade?: string
  uf?: string
}

export interface UpsertMercadoDto {
  cnpj: string
  razaoSocial?: string
  nomeFantasia?: string
  endereco?: EnderecoMercadoDto
  cep?: string
}
