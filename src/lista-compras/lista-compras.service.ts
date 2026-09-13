import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { ListaCompras } from './schemas/lista-compras.schema'
import { ProdutoApelido } from './schemas/produto-apelido.schema'
import { NotaFiscal } from '../nota-fiscal/schemas/nota-fiscal.schema'
import { Produto } from '../nota-fiscal/schemas/produto.schema'
import { EstabelecimentoUsuario } from '../nota-fiscal/schemas/estabelecimento-usuario.schema'
import { GerarListaDto } from './dto/gerar-lista.dto'
import { MarcarItemDto } from './dto/marcar-item.dto'
import { AdicionarItemDto } from './dto/adicionar-item.dto'
import { SalvarApelidoDto } from './dto/salvar-apelido.dto'
import { SalvarItensLoteDto } from './dto/salvar-itens-lote.dto'

@Injectable()
export class ListaComprasService {
  constructor(
    @InjectModel(ListaCompras.name) private readonly listaComprasModel: Model<ListaCompras>,
    @InjectModel(ProdutoApelido.name) private readonly produtoApelidoModel: Model<ProdutoApelido>,
    @InjectModel(NotaFiscal.name) private readonly notaFiscalModel: Model<NotaFiscal>,
    @InjectModel(Produto.name) private readonly produtoModel: Model<Produto>,
    @InjectModel(EstabelecimentoUsuario.name) private readonly estabelecimentoUsuarioModel: Model<EstabelecimentoUsuario>,
  ) {}

  private userFilter(userId: string) {
    return { $or: [{ userId: new Types.ObjectId(userId) }, { userId }] }
  }

  async listarMercadosComHistorico(userId: string) {
    const notas = await this.notaFiscalModel.aggregate([
      { $match: this.userFilter(userId) },
      {
        $group: {
          _id: '$cnpj',
          nomeOriginal: { $first: '$estabelecimento' },
          totalNotas: { $sum: 1 },
          meses: {
            $addToSet: {
              $dateToString: { format: '%Y-%m', date: '$dataEmissao' }
            }
          }
        }
      },
      {
        $project: {
          cnpj: '$_id',
          nomeOriginal: 1,
          totalNotas: 1,
          mesesDisponiveis: { $size: '$meses' },
          _id: 0
        }
      }
    ])

    const estabelecimentosUsuarios = await this.estabelecimentoUsuarioModel.find(this.userFilter(userId))
    const deParaMap = new Map(estabelecimentosUsuarios.map(eu => [eu.cnpj, eu.nomeDepara]))

    return notas.map(n => ({
      ...n,
      nomeDepara: deParaMap.get(n.cnpj) || null
    }))
  }

  async gerarLista(userId: string, dto: GerarListaDto) {
    const periodoMeses = dto.periodoMeses || 3
    const dataFim = new Date()
    const dataInicio = new Date()
    dataInicio.setMonth(dataInicio.getMonth() - periodoMeses)

    const notas = await this.notaFiscalModel.find({
      ...this.userFilter(userId),
      cnpj: dto.cnpj,
      dataEmissao: { $gte: dataInicio, $lte: dataFim }
    }).populate({ path: 'produtos', model: Produto.name })

    const produtosPlanos = notas.flatMap(nota => 
      ((nota.produtos || []) as any[]).map(produto => ({
        produto,
        dataEmissao: nota.dataEmissao
      }))
    )

    const grupos = new Map<string, Array<{ produto: any, dataEmissao: Date }>>()
    
    for (const item of produtosPlanos) {
      if (!item.produto || !item.produto.nome) continue
      const nomeChave = item.produto.nome.toUpperCase().trim()
      if (!grupos.has(nomeChave)) grupos.set(nomeChave, [])
      grupos.get(nomeChave)!.push(item)
    }

    const apelidos = await this.produtoApelidoModel.find(this.userFilter(userId))
    const apelidoMap = new Map(apelidos.map(a => [a.nomeOriginal.toUpperCase().trim(), a.apelido]))

    const itensFiltrados = []
    
    for (const [nomeChave, itens] of grupos.entries()) {
      const mesesDistintos = new Set(
        itens.map(i => {
          const d = new Date(i.dataEmissao)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        })
      )
      
      const frequencia = mesesDistintos.size
      if (frequencia < 2) continue

      const quantidadeTotal = itens.reduce((sum, i) => sum + i.produto.quantidade, 0)
      const mediaQuantidade = Math.ceil(quantidadeTotal / frequencia)

      const itensOrdenados = [...itens].sort((a, b) => 
        b.dataEmissao.getTime() - a.dataEmissao.getTime()
      )
      const maisRecente = itensOrdenados[0].produto
      const valorUnitarioRecente = maisRecente.valorUnitario || (maisRecente.valorTotal / maisRecente.quantidade)

      const nomeExibicao = apelidoMap.get(nomeChave) || maisRecente.nome
      const valorEstimado = mediaQuantidade * valorUnitarioRecente

      itensFiltrados.push({
        nome: nomeExibicao,
        nomeOriginal: maisRecente.nome,
        quantidade: mediaQuantidade,
        unidade: maisRecente.unidade,
        valorEstimado,
        valorUnitarioRecente,
        frequencia,
        comprado: false
      })
    }

    itensFiltrados.sort((a, b) => {
      if (b.frequencia !== a.frequencia) return b.frequencia - a.frequencia
      return a.nome.localeCompare(b.nome)
    })

    const estimativaTotal = itensFiltrados.reduce((sum, i) => sum + i.valorEstimado, 0)

    let nomeEstabelecimento = 'Estabelecimento Desconhecido'
    const estabelecimentoUsuario = await this.estabelecimentoUsuarioModel.findOne({
      ...this.userFilter(userId),
      cnpj: dto.cnpj
    })
    
    if (estabelecimentoUsuario?.nomeDepara) {
      nomeEstabelecimento = estabelecimentoUsuario.nomeDepara
    } else if (notas.length > 0) {
      nomeEstabelecimento = notas[0].estabelecimento
    }

    const listaDocs = await this.listaComprasModel.findOneAndUpdate(
      this.userFilter(userId),
      {
        userId: new Types.ObjectId(userId),
        cnpj: dto.cnpj,
        nomeEstabelecimento,
        periodoAnaliseMeses: periodoMeses,
        estimativaTotal,
        itens: itensFiltrados
      },
      { upsert: true, new: true }
    )

    return listaDocs
  }

  async obterLista(userId: string) {
    const lista = await this.listaComprasModel.findOne(this.userFilter(userId))
    if (!lista) throw new NotFoundException('Lista não encontrada')
    return lista
  }

  async marcarItem(userId: string, index: number, dto: MarcarItemDto) {
    const field = `itens.${index}.comprado`
    const lista = await this.listaComprasModel.findOneAndUpdate(
      this.userFilter(userId),
      { $set: { [field]: dto.comprado } },
      { new: true }
    )
    if (!lista) throw new NotFoundException('Lista não encontrada')
    return lista
  }

  async salvarItensEmLote(userId: string, dto: SalvarItensLoteDto) {
    const updateQuery = dto.itens.reduce<Record<string, boolean>>((acc, item) => {
      acc[`itens.${item.index}.comprado`] = item.comprado
      return acc
    }, {})

    const lista = await this.listaComprasModel.findOneAndUpdate(
      this.userFilter(userId),
      { $set: updateQuery },
      { new: true }
    )
    if (!lista) throw new NotFoundException('Lista não encontrada')
    return lista
  }

  async removerItem(userId: string, index: number) {
    // Unset first, then pull null to remove item at index
    const field = `itens.${index}`
    await this.listaComprasModel.updateOne(
      this.userFilter(userId),
      { $unset: { [field]: 1 } }
    )
    const lista = await this.listaComprasModel.findOneAndUpdate(
      this.userFilter(userId),
      { $pull: { itens: null } },
      { new: true }
    )
    if (!lista) throw new NotFoundException('Lista não encontrada')
    
    // Recalculate estimativaTotal
    const estimativaTotal = lista.itens.reduce((sum, item) => sum + item.valorEstimado, 0)
    lista.estimativaTotal = estimativaTotal
    await lista.save()
    
    return lista
  }

  async adicionarItem(userId: string, dto: AdicionarItemDto) {
    const valorEstimado = dto.valorEstimado || 0
    
    const newItem = {
      nome: dto.nome,
      nomeOriginal: dto.nome,
      quantidade: dto.quantidade,
      unidade: dto.unidade,
      valorEstimado,
      valorUnitarioRecente: valorEstimado > 0 ? (valorEstimado / dto.quantidade) : 0,
      frequencia: 1, // default para item manual
      comprado: false
    }

    const lista = await this.listaComprasModel.findOneAndUpdate(
      this.userFilter(userId),
      { 
        $push: { itens: newItem },
        $inc: { estimativaTotal: valorEstimado }
      },
      { new: true }
    )
    if (!lista) throw new NotFoundException('Lista não encontrada')
    return lista
  }

  async excluirLista(userId: string) {
    const result = await this.listaComprasModel.deleteOne(this.userFilter(userId))
    if (result.deletedCount === 0) throw new NotFoundException('Lista não encontrada')
    return { success: true }
  }

  async salvarApelido(userId: string, dto: SalvarApelidoDto) {
    const result = await this.produtoApelidoModel.findOneAndUpdate(
      { ...this.userFilter(userId), nomeOriginal: dto.nomeOriginal },
      {
        userId: new Types.ObjectId(userId),
        nomeOriginal: dto.nomeOriginal,
        apelido: dto.apelido
      },
      { upsert: true, new: true }
    )
    return result
  }

  async listarApelidos(userId: string) {
    return this.produtoApelidoModel.find(this.userFilter(userId)).sort({ nomeOriginal: 1 })
  }

  async removerApelido(userId: string, id: string) {
    const result = await this.produtoApelidoModel.deleteOne({
      _id: new Types.ObjectId(id),
      ...this.userFilter(userId)
    })
    if (result.deletedCount === 0) throw new NotFoundException('Apelido não encontrado')
    return { success: true }
  }
}
