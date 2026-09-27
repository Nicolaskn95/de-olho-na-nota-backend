import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  ProdutoCatalogo,
  ProdutoCatalogoDocument,
} from './schemas/produto-catalogo.schema'
import {
  isEanValido as validarEanUtil,
  sanitizarDescricaoProduto,
  gerarChaveCanonica,
} from './utils/sanitizar-produto.util'

@Injectable()
export class ProdutoCatalogoService {
  private readonly logger = new Logger(ProdutoCatalogoService.name)

  constructor(
    @InjectModel(ProdutoCatalogo.name)
    private readonly produtoCatalogoModel: Model<ProdutoCatalogoDocument>,
  ) {}

  /**
   * Valida se uma string representa um código de barras universal cEAN / GTIN válido.
   */
  isEanValido(ean?: string | null): boolean {
    return validarEanUtil(ean)
  }

  /**
   * Processa e padroniza um item no catálogo global.
   *
   * Regras:
   * - Sanitiza a descrição da nota para remover prefixos fiscais e de setor de mercado.
   * - Gera uma chaveCanonica determinística:
   *   - Se possuir cEAN válido: chave baseada no código de barras ('EAN_...').
   *   - Se for item sem EAN (hortifrúti, carnes, granel): chave baseada no conjunto ordenado de tokens do nome ('CANON_...').
   * - Utiliza findOneAndUpdate com $setOnInsert para garantir que descrições ruidosas posteriores
   *   não sobrescrevam o nome padronizado já estabelecido.
   */
  async processarItemCatalogo(
    codigoOuEan?: string | null,
    descricaoNota?: string | null,
  ): Promise<ProdutoCatalogoDocument | null> {
    const descricaoSanitizada = sanitizarDescricaoProduto(
      descricaoNota ? descricaoNota.trim() : '',
    )

    if (!descricaoSanitizada) {
      this.logger.warn(
        `Item ignorado do catálogo global: descrição vazia [Código: ${codigoOuEan}]`,
      )
      return null
    }

    const chaveCanonica = gerarChaveCanonica(codigoOuEan, descricaoSanitizada)
    const eanValido = this.isEanValido(codigoOuEan)
    const eanLimpo = eanValido ? codigoOuEan!.trim() : null

    const produto = await this.produtoCatalogoModel.findOneAndUpdate(
      { chaveCanonica },
      {
        $setOnInsert: {
          chaveCanonica,
          ean: eanLimpo,
          nomePadronizado: descricaoSanitizada,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    )

    this.logger.log(
      `Produto processado no catálogo global [Chave: ${chaveCanonica}, ID: ${String(produto._id)}]`,
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

  /**
   * Busca um produto no catálogo global pela chave canônica.
   */
  async buscarPorChaveCanonica(
    chaveCanonica: string,
  ): Promise<ProdutoCatalogoDocument | null> {
    if (!chaveCanonica || !chaveCanonica.trim()) {
      return null
    }

    return this.produtoCatalogoModel
      .findOne({ chaveCanonica: chaveCanonica.trim() })
      .populate('categoria')
      .exec()
  }
}
