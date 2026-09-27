export interface ProdutoExtraido {
  nome: string
  codigo: string
  quantidade: number
  unidade: string
  valorUnitario: number
  valorTotal: number
}

export interface TributosDetalhados {
  federal?: number
  estadual?: number
  municipal?: number
}

export interface DadosNotaFiscal {
  chaveAcesso: string
  numero: string
  serie: string
  dataEmissao: Date
  estabelecimento: string
  cnpj: string
  endereco: string
  valorTotal: number
  descontos: number
  valorPago: number
  formaPagamento: string
  tipoPagamento?: string
  cartaoUsado?: string
  valorTributos?: number
  tributosDetalhados?: TributosDetalhados
  produtos: ProdutoExtraido[]
}

