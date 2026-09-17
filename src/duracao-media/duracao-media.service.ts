import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { NotaFiscal } from '../nota-fiscal/schemas/nota-fiscal.schema'
import { Produto } from '../nota-fiscal/schemas/produto.schema'
import { Prefixo } from '../categoria/schemas/prefixo-categoria.schema'
import { Categoria } from '../categoria/schemas/categoria.schema'
import { FiltrarDuracaoDto } from './dto/filtrar-duracao.dto'
import { CalcularDuracaoDto } from './dto/calcular-duracao.dto'
import { QwenAiService, DadosItemConsumo } from './qwen-ai.service'

@Injectable()
export class DuracaoMediaService {
  constructor(
    @InjectModel(NotaFiscal.name)
    private notaFiscalModel: Model<NotaFiscal>,
    @InjectModel(Produto.name)
    private produtoModel: Model<Produto>,
    @InjectModel(Prefixo.name)
    private prefixoModel: Model<Prefixo>,
    @InjectModel(Categoria.name)
    private categoriaModel: Model<Categoria>,
    private qwenAiService: QwenAiService,
  ) {}

  private toUserId(userId: string): Types.ObjectId {
    return new Types.ObjectId(userId)
  }

  async filtrar(userId: string, dto: FiltrarDuracaoDto) {
    const [ano, mes] = dto.mesInicial.split('-').map(Number)
    const startDate = new Date(ano, mes - 1, 1)

    const endMonth = mes - 1 + dto.qtdMeses
    const endDate = new Date(ano, endMonth, 0, 23, 59, 59, 999)

    const categoria = await this.categoriaModel.findById(dto.categoriaId).exec()
    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada')
    }

    const prefixos = await this.prefixoModel
      .find({
        $or: [{ userId: this.toUserId(userId) }, { userId }],
        categoria: new Types.ObjectId(dto.categoriaId),
      })
      .exec()

    const prefixStrings = prefixos.map((p) => p.prefixo)

    if (prefixStrings.length === 0) {
      const allUserPrefixos = await this.prefixoModel
        .find({ $or: [{ userId: this.toUserId(userId) }, { userId }] })
        .exec()

      const allPrefixos = await this.prefixoModel.find({}).limit(10).exec()

      const allUserNotas = await this.notaFiscalModel
        .find({ $or: [{ userId: this.toUserId(userId) }, { userId }] })
        .exec()

      const allNotas = await this.notaFiscalModel.find({}).limit(5).exec()

      return {
        notasFiscais: [],
        categoria,
        periodoInicio: startDate,
        periodoFim: endDate,
        debug: {
          userId,
          categoriaIdQuery: dto.categoriaId,
          prefixosEncontrados: prefixStrings,
          totalPrefixosQuery: prefixos.length,
          totalNotasQuery: 0,
          prefixosRaw: prefixos,
          allUserPrefixos,
          allPrefixosSample: allPrefixos,
          allUserNotasCount: allUserNotas.length,
          allUserNotasSample: allUserNotas.slice(0, 5).map((n) => ({
            _id: n._id,
            userId: n.userId,
            dataEmissao: n.dataEmissao,
            dataEmissaoType: typeof n.dataEmissao,
            isDateInstance: n.dataEmissao instanceof Date,
          })),
          allNotasSample: allNotas.map((n) => ({
            _id: n._id,
            userId: n.userId,
            dataEmissao: n.dataEmissao,
            dataEmissaoType: typeof n.dataEmissao,
            isDateInstance: n.dataEmissao instanceof Date,
          })),
          notasMapeadas: [],
        },
      }
    }

    const notas = await this.notaFiscalModel
      .find({
        $or: [{ userId: this.toUserId(userId) }, { userId }],
        dataEmissao: { $gte: startDate, $lte: endDate },
      })
      .populate('produtos')
      .exec()

    const notasFiltradas: any[] = []

    for (const nf of notas) {
      const produtosFiltrados: Produto[] = []
      const rawProdutos = Array.isArray(nf.produtos) ? nf.produtos : []

      for (const prod of rawProdutos) {
        let productDoc: any = prod

        if (prod && !(prod as any).nome) {
          productDoc = await this.produtoModel.findById(prod).exec()
        }

        if (productDoc && typeof productDoc.nome === 'string') {
          const nomeLimpo = productDoc.nome
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase()
          const SIGLAS =
            /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PR|PE|PI|RJ|RN|RO|RS|SC|SP|SE|TO)\s+/i
          const nomeSemSigla = nomeLimpo.replace(SIGLAS, '').trim() || nomeLimpo

          const matches = prefixStrings.some((prefix) => {
            const prefixUpper = prefix.toUpperCase().trim()
            return (
              nomeLimpo.startsWith(prefixUpper) ||
              nomeSemSigla.startsWith(prefixUpper)
            )
          })

          if (matches) {
            produtosFiltrados.push(productDoc)
          }
        }
      }

      if (produtosFiltrados.length > 0) {
        notasFiltradas.push({
          _id: nf._id,
          chaveAcesso: nf.chaveAcesso,
          numero: nf.numero,
          serie: nf.serie,
          dataEmissao: nf.dataEmissao,
          estabelecimento: nf.estabelecimento,
          cnpj: nf.cnpj,
          valorTotal: nf.valorTotal,
          valorPago: nf.valorPago,
          produtos: produtosFiltrados,
        })
      }
    }

    return {
      notasFiscais: notasFiltradas,
      categoria,
      periodoInicio: startDate,
      periodoFim: endDate,
      debug: {
        userId,
        prefixosEncontrados: prefixStrings,
        totalPrefixosQuery: prefixos.length,
        totalNotasQuery: notas.length,
        prefixosRaw: prefixos,
        notasMapeadas: notas.map((n: any) => ({
          _id: n._id,
          userId: n.userId,
          dataEmissao: n.dataEmissao,
          produtosCount: n.produtos ? n.produtos.length : 0,
          produtos: n.produtos
            ? n.produtos.map((p: any) => ({
                _id: p._id,
                nome: p.nome,
                hasNome: !!p.nome,
              }))
            : [],
        })),
      },
    }
  }

  async calcular(userId: string, dto: CalcularDuracaoDto) {
    const produtoObjectIds = dto.produtoIds.map((id) => new Types.ObjectId(id))

    const produtos = await this.produtoModel
      .find({ _id: { $in: produtoObjectIds } })
      .exec()

    if (produtos.length === 0) {
      throw new NotFoundException('Nenhum produto encontrado')
    }

    const produtosComData: { nome: string; dataEmissao: Date }[] = []

    for (const produto of produtos) {
      const nf = await this.notaFiscalModel.findById(produto.notaFiscal).exec()

      if (nf) {
        const dataEmissao =
          nf.dataEmissao instanceof Date
            ? nf.dataEmissao
            : new Date(nf.dataEmissao)
        const nomeLimpo = produto.nome.replace(/\s+/g, ' ').trim().toUpperCase()
        const SIGLAS =
          /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PR|PE|PI|RJ|RN|RO|RS|SC|SP|SE|TO)\s+/i
        const nomeSemSigla = nomeLimpo.replace(SIGLAS, '').trim() || nomeLimpo

        produtosComData.push({
          nome: nomeSemSigla,
          dataEmissao,
        })
      }
    }

    const grupos = new Map<string, Date[]>()
    for (const item of produtosComData) {
      const datas = grupos.get(item.nome) || []
      datas.push(item.dataEmissao)
      grupos.set(item.nome, datas)
    }

    let totalDiffDays = 0
    const detalhes: {
      nome: string
      ocorrencias: number
      diferencasDias: number[]
      totalDias: number
    }[] = []

    for (const [nome, datas] of grupos) {
      datas.sort((a, b) => a.getTime() - b.getTime())

      const diferencasDias: number[] = []
      let totalDiasGrupo = 0

      for (let i = 1; i < datas.length; i++) {
        const diffMs = datas[i].getTime() - datas[i - 1].getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
        diferencasDias.push(diffDays)
        totalDiasGrupo += diffDays
      }

      totalDiffDays += totalDiasGrupo

      detalhes.push({
        nome,
        ocorrencias: datas.length,
        diferencasDias,
        totalDias: totalDiasGrupo,
      })
    }

    const duracaoMediaDias =
      dto.qtdMeses > 0 ? Math.round(totalDiffDays / dto.qtdMeses) : 0

    return {
      duracaoMediaDias,
      detalhes,
      qtdMeses: dto.qtdMeses,
    }
  }

  async calcularIa(userId: string, dto: CalcularDuracaoDto) {
    const produtoObjectIds = dto.produtoIds.map((id) => new Types.ObjectId(id))

    const produtos = await this.produtoModel
      .find({ _id: { $in: produtoObjectIds } })
      .exec()

    if (produtos.length === 0) {
      throw new NotFoundException('Nenhum produto encontrado')
    }

    const produtosAgrupados = new Map<
      string,
      {
        unidade: string
        quantidadeTotal: number
        comprasCount: number
        datas: Date[]
        valores: number[]
      }
    >()

    for (const produto of produtos) {
      const nf = await this.notaFiscalModel.findById(produto.notaFiscal).exec()

      if (nf) {
        const dataEmissao =
          nf.dataEmissao instanceof Date
            ? nf.dataEmissao
            : new Date(nf.dataEmissao)

        const nomeLimpo = produto.nome.replace(/\s+/g, ' ').trim().toUpperCase()
        const SIGLAS =
          /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PR|PE|PI|RJ|RN|RO|RS|SC|SP|SE|TO)\s+/i
        const nomeSemSigla = nomeLimpo.replace(SIGLAS, '').trim() || nomeLimpo

        const existente = produtosAgrupados.get(nomeSemSigla) || {
          unidade: produto.unidade || 'un',
          quantidadeTotal: 0,
          comprasCount: 0,
          datas: [],
          valores: [],
        }

        existente.quantidadeTotal += produto.quantidade || 1
        existente.comprasCount += 1
        existente.datas.push(dataEmissao)
        if (produto.valorTotal) existente.valores.push(produto.valorTotal)

        produtosAgrupados.set(nomeSemSigla, existente)
      }
    }

    const itensConsumo: DadosItemConsumo[] = []

    for (const [nome, grupo] of produtosAgrupados) {
      grupo.datas.sort((a, b) => a.getTime() - b.getTime())

      const diferencasDias: number[] = []
      for (let i = 1; i < grupo.datas.length; i++) {
        const diffMs = grupo.datas[i].getTime() - grupo.datas[i - 1].getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
        diferencasDias.push(diffDays)
      }

      itensConsumo.push({
        nome,
        unidade: grupo.unidade,
        quantidadeTotal: grupo.quantidadeTotal,
        comprasCount: grupo.comprasCount,
        datas: grupo.datas,
        diferencasDias,
      })
    }

    return this.qwenAiService.analisarConsumo(itensConsumo, dto.qtdMeses)
  }
}
