import {
  Injectable,
  ConflictException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Categoria } from './schemas/categoria.schema'
import { Prefixo } from './schemas/prefixo-categoria.schema'
import { CriarPrefixoDto } from './dto/criar-prefixo.dto'
import { ImportarPrefixosDto } from './dto/importar-prefixos.dto'
import { NotaFiscal } from '../nota-fiscal/schemas/nota-fiscal.schema'
import { ClassificarProdutosIaDto } from './dto/classificar-produtos-ia.dto'
import { QwenAiService } from '../duracao-media/qwen-ai.service'

export interface ImportarPrefixosResultado {
  criados: number
  ignorados: number
  erros: { prefixo: string; motivo: string }[]
  prefixos: Prefixo[]
}

@Injectable()
export class CategoriaService implements OnModuleInit {
  private readonly logger = new Logger(CategoriaService.name)

  constructor(
    @InjectModel(Categoria.name)
    private categoriaModel: Model<Categoria>,
    @InjectModel(Prefixo.name)
    private prefixoModel: Model<Prefixo>,
    @InjectModel(NotaFiscal.name)
    private notaFiscalModel: Model<NotaFiscal>,
    private qwenAiService: QwenAiService,
  ) {}

  async onModuleInit() {
    const result = await this.prefixoModel.deleteMany({
      userId: { $exists: false },
    })
    if (result.deletedCount > 0) {
      this.logger.log(
        `Removidos ${result.deletedCount} prefixos globais sem userId`,
      )
    }
  }

  // ========== CATEGORIAS ==========

  async listarCategorias(): Promise<Categoria[]> {
    return this.categoriaModel.find().sort({ nome: 1 }).exec()
  }

  async buscarCategoriaPorId(id: string): Promise<Categoria | null> {
    return this.categoriaModel.findById(id).exec()
  }

  // ========== PREFIXOS ==========

  private toUserId(userId: string): Types.ObjectId {
    return new Types.ObjectId(userId)
  }

  async criarPrefixo(userId: string, dto: CriarPrefixoDto): Promise<Prefixo> {
    const userObjectId = this.toUserId(userId)
    const prefixoUpperCase = dto.prefixo.toUpperCase().trim()

    const existente = await this.prefixoModel.findOne({
      userId: userObjectId,
      prefixo: prefixoUpperCase,
    })

    if (existente) {
      throw new ConflictException(
        `O prefixo "${prefixoUpperCase}" já está cadastrado`,
      )
    }

    const categoria = await this.categoriaModel.findById(dto.categoriaId)
    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada')
    }

    const prefixo = new this.prefixoModel({
      prefixo: prefixoUpperCase,
      categoria: dto.categoriaId,
      userId: userObjectId,
    })

    const salvo = await prefixo.save()
    return this.prefixoModel
      .findById(salvo._id)
      .populate('categoria')
      .exec() as Promise<Prefixo>
  }

  async listarPrefixos(userId: string): Promise<Prefixo[]> {
    return this.prefixoModel
      .find({ userId: this.toUserId(userId) })
      .populate('categoria')
      .sort({ prefixo: 1 })
      .exec()
  }

  async atualizarPrefixo(
    userId: string,
    id: string,
    dto: CriarPrefixoDto,
  ): Promise<Prefixo> {
    const userObjectId = this.toUserId(userId)
    const prefixoUpperCase = dto.prefixo.toUpperCase().trim()

    const existente = await this.prefixoModel.findOne({
      userId: userObjectId,
      prefixo: prefixoUpperCase,
      _id: { $ne: id },
    })

    if (existente) {
      throw new ConflictException(
        `O prefixo "${prefixoUpperCase}" já está cadastrado`,
      )
    }

    const categoria = await this.categoriaModel.findById(dto.categoriaId)
    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada')
    }

    const atualizado = await this.prefixoModel
      .findOneAndUpdate(
        { _id: id, userId: userObjectId },
        { prefixo: prefixoUpperCase, categoria: dto.categoriaId },
        { new: true },
      )
      .populate('categoria')

    if (!atualizado) {
      throw new NotFoundException('Prefixo não encontrado')
    }

    return atualizado
  }

  async removerPrefixo(userId: string, id: string): Promise<void> {
    const result = await this.prefixoModel.findOneAndDelete({
      _id: id,
      userId: this.toUserId(userId),
    })
    if (!result) {
      throw new NotFoundException('Prefixo não encontrado')
    }
  }

  async importarPrefixos(
    userId: string,
    dto: ImportarPrefixosDto,
  ): Promise<ImportarPrefixosResultado> {
    const userObjectId = this.toUserId(userId)
    const categorias = await this.categoriaModel.find().exec()
    const codigoMap = new Map(
      categorias.map((c) => [c.codigo.toUpperCase(), c._id]),
    )

    const existentes = await this.prefixoModel
      .find({ userId: userObjectId })
      .select('prefixo')
      .exec()
    const existentesSet = new Set(existentes.map((p) => p.prefixo))

    let criados = 0
    let ignorados = 0
    const erros: { prefixo: string; motivo: string }[] = []
    const vistosNoLote = new Set<string>()

    for (const item of dto.prefixos) {
      const prefixoUpperCase = item.prefixo.toUpperCase().trim()
      const codigoCategoria = item.codigoCategoria.trim().toUpperCase()

      if (vistosNoLote.has(prefixoUpperCase)) {
        ignorados++
        continue
      }
      vistosNoLote.add(prefixoUpperCase)

      const categoriaId = codigoMap.get(codigoCategoria)
      if (!categoriaId) {
        erros.push({
          prefixo: prefixoUpperCase,
          motivo: `Categoria "${item.codigoCategoria}" inválida`,
        })
        continue
      }

      if (existentesSet.has(prefixoUpperCase)) {
        ignorados++
        continue
      }

      await this.prefixoModel.create({
        prefixo: prefixoUpperCase,
        categoria: categoriaId,
        userId: userObjectId,
      })
      existentesSet.add(prefixoUpperCase)
      criados++
    }

    const prefixos = await this.listarPrefixos(userId)

    return { criados, ignorados, erros, prefixos }
  }

  async buscarCategoriaPorNomeProduto(
    userId: string,
    nomeProduto: string,
  ): Promise<Categoria | null> {
    const nomeUpperCase = nomeProduto.toUpperCase()
    const prefixos = await this.prefixoModel
      .find({ userId: this.toUserId(userId) })
      .populate('categoria')
      .exec()

    const prefixosOrdenados = prefixos.sort(
      (a, b) => b.prefixo.length - a.prefixo.length,
    )

    for (const p of prefixosOrdenados) {
      if (nomeUpperCase.startsWith(p.prefixo)) {
        return p.categoria as unknown as Categoria
      }
    }

    return null
  }

  async classificarProdutosComIa(
    userId: string,
    dto: ClassificarProdutosIaDto,
  ): Promise<Prefixo[]> {
    const userObjectId = this.toUserId(userId)
    let produtosNomes: string[] = dto.produtos || []

    // Se notaFiscalId for fornecido, o backend busca a nota fiscal no banco e lê os nomes dos produtos diretamente
    if (dto.notaFiscalId) {
      const nota = await this.notaFiscalModel
        .findOne({ _id: dto.notaFiscalId, userId: userObjectId })
        .populate('produtos')
        .exec()

      if (nota && Array.isArray(nota.produtos)) {
        const nomesDoBanco = nota.produtos
          .map((p: any) => (typeof p === 'object' && p?.nome ? p.nome : null))
          .filter(Boolean)
        produtosNomes = Array.from(new Set([...produtosNomes, ...nomesDoBanco]))
      }
    }

    const categorias = await this.categoriaModel.find().exec()
    const codigoMap = new Map(
      categorias.map((c) => [c.codigo.toUpperCase(), c._id]),
    )

    const categoriasDisponiveis = categorias.map((c) => ({
      id: c._id.toString(),
      codigo: c.codigo,
      nome: c.nome,
    }))

    // Buscar prefixos já existentes do usuário para pular produtos já classificados
    const existentes = await this.prefixoModel
      .find({ userId: userObjectId })
      .select('prefixo')
      .exec()

    const existentesSet = new Set(
      existentes.map((p) => p.prefixo.toUpperCase()),
    )
    const prefixosOrdenados = Array.from(existentesSet).sort(
      (a, b) => b.length - a.length,
    )

    // Filtrar apenas produtos que AINDA NÃO possuem classificação
    const produtosSemCategoria = produtosNomes.filter((nomeProd) => {
      const nomeUpper = nomeProd.toUpperCase().trim()
      if (!nomeUpper) return false
      return !prefixosOrdenados.some((prefixo) => nomeUpper.startsWith(prefixo))
    })

    if (produtosSemCategoria.length === 0) {
      this.logger.log(
        'Todos os produtos já possuem classificação. Nenhum novo prefixo inserido.',
      )
      return this.listarPrefixos(userId)
    }

    // Chamar IA para classificar os produtos pendentes
    const classificacoes = await this.qwenAiService.classificarProdutos(
      produtosSemCategoria,
      categoriasDisponiveis,
    )

    const novosPrefixosDocs: Array<{
      prefixo: string
      categoria: Types.ObjectId
      userId: Types.ObjectId
    }> = []

    for (const c of classificacoes) {
      const prefixoUpper = c.prefixo.toUpperCase().trim()
      const codigoCat = c.codigoCategoria.toUpperCase().trim()
      const categoriaId = codigoMap.get(codigoCat)

      if (!categoriaId || prefixoUpper.length < 2) continue

      if (!existentesSet.has(prefixoUpper)) {
        novosPrefixosDocs.push({
          prefixo: prefixoUpper,
          categoria: categoriaId,
          userId: userObjectId,
        })
        existentesSet.add(prefixoUpper)
      }
    }

    // Inserção em lote (insertMany) dos novos prefixos gerados pela IA
    if (novosPrefixosDocs.length > 0) {
      this.logger.log(
        `Inserindo ${novosPrefixosDocs.length} novos prefixos via insertMany...`,
      )
      await this.prefixoModel.insertMany(novosPrefixosDocs, { ordered: false })
    }

    return this.listarPrefixos(userId)
  }
}
