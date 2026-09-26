import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import {
  HistoricoCompra,
  HistoricoCompraDocument,
} from './schemas/historico-compra.schema'
import { EstatisticasPrecoProduto } from './interfaces/historico-compra.interface'

@Injectable()
export class HistoricoCompraService {
  constructor(
    @InjectModel(HistoricoCompra.name)
    private readonly historicoCompraModel: Model<HistoricoCompraDocument>,
  ) {}

  /**
   * Retorna o menor, maior e preço médio praticado para determinado produto nos últimos 30 dias.
   * Não utiliza .populate(), processando os cálculos diretamente no MongoDB Engine via Aggregation Pipeline.
   *
   * @param produtoCatalogoId ID do produto no catálogo global (ObjectId ou string)
   * @returns EstatisticasPrecoProduto | null
   */
  async buscarEvolucaoPrecoProduto(
    produtoCatalogoId: string | Types.ObjectId,
  ): Promise<EstatisticasPrecoProduto | null> {
    if (!produtoCatalogoId) {
      throw new BadRequestException('ID do produto é obrigatório.')
    }

    if (!Types.ObjectId.isValid(produtoCatalogoId)) {
      throw new BadRequestException('ID do produto inválido.')
    }

    // Cast defensivo para Types.ObjectId (Aggregation Pipeline não realiza cast automático)
    const targetObjectId =
      typeof produtoCatalogoId === 'string'
        ? new Types.ObjectId(produtoCatalogoId)
        : produtoCatalogoId

    // Janela temporal: Últimos 30 dias
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 30)

    const resultado =
      await this.historicoCompraModel.aggregate<EstatisticasPrecoProduto>([
        // ETAPA 1: $match - Utiliza o índice composto { produtoCatalogoId: 1, mercadoId: 1, dataCompra: -1 }
        {
          $match: {
            produtoCatalogoId: targetObjectId,
            dataCompra: { $gte: dataLimite },
          },
        },

        // ETAPA 2: $group - Agrupa as compras do produto e calcula acumuladores estatísticos
        {
          $group: {
            _id: '$produtoCatalogoId',
            precoMinimo: { $min: '$precoUnitario' },
            precoMaximo: { $max: '$precoUnitario' },
            precoMedio: { $avg: '$precoUnitario' },
            totalRegistros: { $sum: 1 },
            dataMaisRecente: { $max: '$dataCompra' },
          },
        },

        // ETAPA 3: $sort - Ordena pela compra mais recente
        {
          $sort: {
            dataMaisRecente: -1,
          },
        },

        // ETAPA 4: $project - Formata e arredonda os valores para 2 casas decimais
        {
          $project: {
            _id: 0,
            produtoCatalogoId: { $toString: '$_id' },
            precoMinimo: { $round: ['$precoMinimo', 2] },
            precoMaximo: { $round: ['$precoMaximo', 2] },
            precoMedio: { $round: ['$precoMedio', 2] },
            totalRegistros: 1,
            dataMaisRecente: 1,
            periodoDias: { $literal: 30 },
          },
        },
      ])

    return resultado.length > 0 ? resultado[0] : null
  }

  /**
   * Insere em lote múltiplos itens de compra na coleção de histórico
   */
  async registrarItensEmLote(
    itens: Partial<HistoricoCompra>[],
  ): Promise<HistoricoCompraDocument[]> {
    if (!itens || itens.length === 0) {
      return []
    }

    return (await this.historicoCompraModel.insertMany(
      itens,
    )) as unknown as HistoricoCompraDocument[]
  }
}
