export interface EstatisticasPrecoProduto {
  produtoCatalogoId: string
  precoMinimo: number
  precoMaximo: number
  precoMedio: number
  totalRegistros: number
  periodoDias: number
  dataMaisRecente: Date
}

export interface EstabelecimentoItemStats {
  total: number
  count: number
  ultimoPreco: number
}

export interface PrecoMesStats {
  total: number
  count: number
}

export interface CategoriaResponseDto {
  _id: string
  nome: string
  cor?: string
  icone?: string
}

export interface ProdutoAgrupadoResponse {
  id: string
  nome: string
  nomes: string[]
  totalGasto: number
  totalQuantidade: number
  vezesComprado: number
  mediaPrecoUnitario: number
  ultimoPreco: number
  ultimaData: string
  estabelecimentos: Record<string, EstabelecimentoItemStats>
  precosPorMes: Record<string, PrecoMesStats>
  variacao: number | null
  categoria: CategoriaResponseDto | null
}
