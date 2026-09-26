import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  ProdutoCatalogo,
  ProdutoCatalogoDocument,
} from './schemas/produto-catalogo.schema'

@Injectable()
export class ProdutoCatalogoService {
  private readonly logger = new Logger(ProdutoCatalogoService.name)

  constructor(
    @InjectModel(ProdutoCatalogo.name)
    private readonly produtoCatalogoModel: Model<ProdutoCatalogoDocument>,
  ) {}

  /**
   * Valida se uma string representa um código de barras universal cEAN / GTIN válido.
   *
   * Regras:
   * - Deve ser não-nulo e conter apenas dígitos numéricos após limpeza.
   * - Rejeita explicitamente marcações como "SEM GTIN" e "SEMGTIN".
   * - Padrão internacional GTIN: 8, 12, 13 ou 14 dígitos numéricos.
   * - Rejeita códigos com prefixo de pesagem interna de loja/padaria (padrão GS1: prefixos 20 a 29
   *   para produtos de peso variável/circulação restrita, ex: 13 dígitos iniciados com 2).
   */
  isEanValido(ean?: string | null): boolean {
    if (!ean || typeof ean !== 'string') {
      return false
    }

    const valorNormalizado = ean.trim().toUpperCase()

    if (
      valorNormalizado === 'SEM GTIN' ||
      valorNormalizado === 'SEMGTIN' ||
      valorNormalizado === 'NAO INFORMADO' ||
      valorNormalizado === 'NULL'
    ) {
      return false
    }

    // Apenas dígitos
    if (!/^\d+$/.test(valorNormalizado)) {
      return false
    }

    const tamanho = valorNormalizado.length
    if (![8, 12, 13, 14].includes(tamanho)) {
      return false
    }

    // Códigos de pesagem interna (GS1 prefixo 20-29 para itens de peso variável como padaria, carnes, hortifrúti)
    if (tamanho === 13 && valorNormalizado.startsWith('2')) {
      return false
    }

    return true
  }

  /**
   * Processa um item no catálogo global com base estritamente no cEAN.
   *
   * Regra Anti-Poluição:
   * - Utiliza findOneAndUpdate com $setOnInsert para garantir que descrições ruidosas
   *   vindas de notas da SEFAZ não sobrescrevam um nome padronizado já existente.
   * - Retorna null caso o item não possua um cEAN válido (ex: itens pesados, padaria)
   *   ou se a descrição da nota for inválida/vazia.
   */
  async processarItemCatalogo(
    ean?: string | null,
    descricaoNota?: string | null,
  ): Promise<ProdutoCatalogoDocument | null> {
    if (!this.isEanValido(ean)) {
      this.logger.debug(
        `Item ignorado do catálogo global: cEAN inválido ou ausente [${ean}]`,
      )
      return null
    }

    const descricaoLimpa = descricaoNota ? descricaoNota.trim() : ''
    if (!descricaoLimpa) {
      this.logger.warn(
        `Item ignorado do catálogo global: descrição vazia [EAN: ${ean}]`,
      )
      return null
    }

    const eanLimpo = ean!.trim()

    const produto = await this.produtoCatalogoModel.findOneAndUpdate(
      { ean: eanLimpo },
      {
        $setOnInsert: {
          ean: eanLimpo,
          nomePadronizado: descricaoLimpa,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    )

    this.logger.log(
      `Produto processado no catálogo global [EAN: ${eanLimpo}, ID: ${String(produto._id)}]`,
    )

    return produto
  }

  /**
   * Busca um produto no catálogo global pelo código universal EAN.
   */
  async buscarPorEan(ean: string): Promise<ProdutoCatalogoDocument | null> {
    if (!this.isEanValido(ean)) {
      return null
    }

    return this.produtoCatalogoModel
      .findOne({ ean: ean.trim() })
      .populate('categoria')
      .exec()
  }
}
