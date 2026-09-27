import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import {
  HistoricoCompra,
  HistoricoCompraDocument,
} from './schemas/historico-compra.schema'
import {
  EstatisticasPrecoProduto,
  ProdutoAgrupadoResponse,
  EstabelecimentoItemStats,
  PrecoMesStats,
} from './interfaces/historico-compra.interface'

@Injectable()
export class HistoricoCompraService {
  constructor(
    @InjectModel(HistoricoCompra.name)
    private readonly historicoCompraModel: Model<HistoricoCompraDocument>,
  ) {}

  /**
   * Retorna os produtos agrupados pelo catálogo global (ou chave canônica),
   * calculando estatísticas agregadas (total gasto, frequência, histórico de preços por mercado e mensal).
   */
  async listarProdutosAgrupados(
    usuarioId: string,
    dataInicio?: string,
    dataFim?: string,
  ): Promise<ProdutoAgrupadoResponse[]> {
    if (!usuarioId || !Types.ObjectId.isValid(usuarioId)) {
      throw new BadRequestException('ID de usuário inválido.')
    }

    const matchStage: Record<string, any> = {
      usuarioId: new Types.ObjectId(usuarioId),
    }

    if (dataInicio || dataFim) {
      matchStage.dataCompra = {}
      if (dataInicio) {
        matchStage.dataCompra.$gte = new Date(dataInicio)
      }
      if (dataFim) {
        const fim = new Date(dataFim)
        fim.setHours(23, 59, 59, 999)
        matchStage.dataCompra.$lte = fim
      }
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'notas_fiscais',
          localField: 'notaFiscalId',
          foreignField: '_id',
          as: 'nota',
        },
      },
      {
        $unwind: {
          path: '$nota',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'produtos_catalogo',
          localField: 'produtoCatalogoId',
          foreignField: '_id',
          as: 'catalogo',
        },
      },
      {
        $unwind: {
          path: '$catalogo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'categorias',
          localField: 'catalogo.categoria',
          foreignField: '_id',
          as: 'categoria',
        },
      },
      {
        $unwind: {
          path: '$categoria',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$produtoCatalogoId', '$descricaoBrutaNota'] },
          produtoCatalogoId: { $first: '$produtoCatalogoId' },
          nomePadronizado: { $first: '$catalogo.nomePadronizado' },
          categoria: { $first: '$categoria' },
          nomes: { $addToSet: '$descricaoBrutaNota' },
          totalGasto: { $sum: '$precoTotal' },
          totalQuantidade: { $sum: '$quantidade' },
          vezesComprado: { $sum: 1 },
          itens: {
            $push: {
              precoUnitario: '$precoUnitario',
              precoTotal: '$precoTotal',
              quantidade: '$quantidade',
              dataCompra: '$dataCompra',
              estabelecimento: {
                $ifNull: [
                  '$nota.estabelecimentoOriginal',
                  { $ifNull: ['$nota.estabelecimento', 'Supermercado'] },
                ],
              },
            },
          },
        },
      },
    ]

    const grupos = await this.historicoCompraModel.aggregate(pipeline).exec()

    const resultado: ProdutoAgrupadoResponse[] = grupos.map((g) => {
      const itensOrdenados = [...(g.itens || [])].sort(
        (a, b) =>
          new Date(b.dataCompra).getTime() - new Date(a.dataCompra).getTime(),
      )

      const totalGasto = g.totalGasto || 0
      const totalQuantidade = g.totalQuantidade || 0
      const mediaPreco =
        totalQuantidade > 0 ? totalGasto / totalQuantidade : 0

      const ultimoPreco = itensOrdenados[0]?.precoUnitario || 0
      const ultimaData = itensOrdenados[0]?.dataCompra
        ? new Date(itensOrdenados[0].dataCompra).toISOString()
        : new Date().toISOString()

      const variacao =
        mediaPreco > 0 ? ((ultimoPreco - mediaPreco) / mediaPreco) * 100 : null

      // Agrupamento por estabelecimento
      const estabelecimentos: Record<string, EstabelecimentoItemStats> = {}
      for (const item of itensOrdenados) {
        const estabKey = item.estabelecimento || 'Supermercado'
        if (!estabelecimentos[estabKey]) {
          estabelecimentos[estabKey] = {
            total: 0,
            count: 0,
            ultimoPreco: item.precoUnitario,
          }
        }
        estabelecimentos[estabKey].total += item.precoTotal
        estabelecimentos[estabKey].count += 1
      }

      // Agrupamento por mês (YYYY-MM)
      const precosPorMes: Record<string, PrecoMesStats> = {}
      for (const item of itensOrdenados) {
        const d = new Date(item.dataCompra)
        const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!precosPorMes[mesKey]) {
          precosPorMes[mesKey] = { total: 0, count: 0 }
        }
        precosPorMes[mesKey].total += item.precoUnitario
        precosPorMes[mesKey].count += 1
      }

      const nomePrincipal =
        g.nomePadronizado || g.nomes[0] || 'Produto sem nome'

      const compras = itensOrdenados.map((item) => ({
        dataCompra: item.dataCompra
          ? new Date(item.dataCompra).toISOString()
          : new Date().toISOString(),
        estabelecimento: item.estabelecimento || 'Supermercado',
        precoUnitario: item.precoUnitario || 0,
        quantidade: item.quantidade || 1,
        precoTotal: item.precoTotal || 0,
      }))

      return {
        id: String(g._id),
        nome: nomePrincipal,
        nomes: g.nomes && g.nomes.length > 0 ? g.nomes : [nomePrincipal],
        totalGasto,
        totalQuantidade,
        vezesComprado: g.vezesComprado,
        mediaPrecoUnitario: mediaPreco,
        ultimoPreco,
        ultimaData,
        variacao,
        categoria: g.categoria
          ? {
              _id: String(g.categoria._id),
              nome: g.categoria.nome,
              cor: g.categoria.cor,
              icone: g.categoria.icone,
            }
          : null,
        estabelecimentos,
        precosPorMes,
        compras,
      }
    })

    return resultado.sort((a, b) => b.totalGasto - a.totalGasto)
  }

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

    const targetObjectId =
      typeof produtoCatalogoId === 'string'
        ? new Types.ObjectId(produtoCatalogoId)
        : produtoCatalogoId

    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 30)

    const resultado =
      await this.historicoCompraModel.aggregate<EstatisticasPrecoProduto>([
        {
          $match: {
            produtoCatalogoId: targetObjectId,
            dataCompra: { $gte: dataLimite },
          },
        },
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
        {
          $sort: {
            dataMaisRecente: -1,
          },
        },
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
