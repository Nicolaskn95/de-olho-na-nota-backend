import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

export interface ClassificacaoMicrosservico {
  produto: string
  categoria: string
  confianca: number
}

export interface ResultadoClassificacaoItem {
  produto: string
  prefixo: string
  codigoCategoria: string
}

@Injectable()
export class CategorizadorClientService {
  private readonly logger = new Logger(CategorizadorClientService.name)
  private readonly apiUrl: string

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = (
      this.configService.get<string>('CATEGORIZADOR_API_URL') ||
      process.env.CATEGORIZADOR_API_URL ||
      'http://143.244.145.133:8000'
    ).replace(/\/$/, '')
  }

  /**
   * Extrai um prefixo significativo do início do nome do produto.
   * Garante que nomeProduto.toUpperCase().startsWith(prefixo) seja sempre verdadeiro.
   */
  extrairPrefixo(nome: string): string {
    const limpo = nome.trim().toUpperCase()

    // Detecta se tem prefixo fiscal de embalagem/medida: ex '1 MA - ', '0.686 KG - ', '1 FR - '
    const fiscalMatch = limpo.match(
      /^(\d+([.,]\d+)?\s*(MA|SH|TP|FR|PC|KG|UN|LT|CX|PT|GL|FD|BJ|LATA|BARRA|M|G|GR)\s*[-–]\s*)/i,
    )
    let prefixoFiscal = ''
    let resto = limpo

    if (fiscalMatch) {
      prefixoFiscal = fiscalMatch[1]
      resto = limpo.slice(prefixoFiscal.length).trim()
    }

    const tokens = resto.split(/\s+/)
    const prefixTokens: string[] = []

    for (const token of tokens) {
      // Se encontrou medida de peso/volume (ex: 2L, 500ML, 1KG, 5KG) ou tipo (T1, TP1, TP), interrompe
      if (
        /^(T\d|TP\d?|\d+(\.\d+)?(KG|G|L|ML|UN|PC|M|CM|MG|X\d+)?)$/i.test(token) &&
        prefixTokens.length > 0
      ) {
        break
      }
      prefixTokens.push(token)
      // Se já acumulou 2 palavras com pelo menos 8 caracteres no total, para aqui
      if (prefixTokens.length >= 2 && prefixTokens.join(' ').length >= 8) {
        break
      }
      if (prefixTokens.length >= 3 || prefixTokens.join(' ').length >= 15) {
        break
      }
    }

    const nomeProd = prefixTokens.join(' ').replace(/[^A-Z0-9\s]/g, '').trim()
    const resultado = (prefixoFiscal + nomeProd).trim()

    return resultado.length >= 2 ? resultado : limpo.slice(0, 15).trim()
  }

  /**
   * Verifica a disponibilidade do microsserviço (health-check).
   */
  async isOnline(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/health`, { timeout: 3000 })
      return response.status === 200 && response.data?.status === 'ready'
    } catch {
      return false
    }
  }

  /**
   * Categoriza um produto individual chamando o microsserviço.
   */
  async categorizar(nome: string): Promise<ClassificacaoMicrosservico | null> {
    try {
      const response = await axios.post<ClassificacaoMicrosservico>(
        `${this.apiUrl}/categorizar`,
        { nome },
        { timeout: 8000 },
      )
      return response.data
    } catch (error: any) {
      this.logger.warn(
        `Falha ao categorizar produto "${nome}" via microsserviço: ${error?.message}`,
      )
      return null
    }
  }

  /**
   * Categoriza múltiplos produtos em lote chamando o microsserviço concorrentemente.
   */
  async classificarProdutos(
    produtos: string[],
    categoriasDisponiveis: Array<{ codigo: string; nome: string }>,
  ): Promise<ResultadoClassificacaoItem[]> {
    if (!produtos || produtos.length === 0) return []

    const codigosValidos = new Set(
      categoriasDisponiveis.map((c) => c.codigo.toUpperCase()),
    )

    this.logger.log(
      `Classificando ${produtos.length} produtos via microsserviço em ${this.apiUrl}...`,
    )

    const promessas = produtos.map(async (prod) => {
      const resultado = await this.categorizar(prod)
      const prefixo = this.extrairPrefixo(prod)

      if (resultado && resultado.categoria) {
        const codigo = resultado.categoria.toUpperCase().trim()
        const codigoFinal = codigosValidos.has(codigo)
          ? codigo
          : 'MERCEARIA_SECA'

        return {
          produto: prod,
          prefixo,
          codigoCategoria: codigoFinal,
        }
      }

      return null
    })

    const resultados = await Promise.all(promessas)
    return resultados.filter(
      (r): r is ResultadoClassificacaoItem => r !== null,
    )
  }
}
