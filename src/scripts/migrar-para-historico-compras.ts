import * as dotenv from 'dotenv'
import mongoose, { Types } from 'mongoose'
import { NotaFiscalSchema } from '../nota-fiscal/schemas/nota-fiscal.schema'
import { ProdutoSchema } from '../nota-fiscal/schemas/produto.schema'
import { EstabelecimentoUsuarioSchema } from '../nota-fiscal/schemas/estabelecimento-usuario.schema'
import { ProdutoCatalogoSchema } from '../produto-catalogo/schemas/produto-catalogo.schema'
import { HistoricoCompraSchema } from '../historico-compra/schemas/historico-compra.schema'

dotenv.config()

/**
 * Script de Backfill / Migração:
 * Popula a nova coleção transacional "historicos_compras" a partir das
 * Notas Fiscais e Produtos já existentes no banco de dados.
 *
 * É totalmente idempotente: notas já processadas no HistoricoCompra são ignoradas.
 */
async function migrarParaHistoricoCompras() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/de-olho-na-nota'

  console.log('------------------------------------------------------------')
  console.log('🚀 Iniciando script de migração para HistoricoCompra...')
  console.log(`🔌 Conectando ao MongoDB: ${mongoUri}`)
  console.log('------------------------------------------------------------')

  await mongoose.connect(mongoUri)

  const NotaFiscalModel = mongoose.model('NotaFiscal', NotaFiscalSchema)
  const ProdutoModel = mongoose.model('Produto', ProdutoSchema)
  const EstabelecimentoUsuarioModel = mongoose.model(
    'EstabelecimentoUsuario',
    EstabelecimentoUsuarioSchema,
  )
  const ProdutoCatalogoModel = mongoose.model(
    'ProdutoCatalogo',
    ProdutoCatalogoSchema,
  )
  const HistoricoCompraModel = mongoose.model(
    'HistoricoCompra',
    HistoricoCompraSchema,
  )

  const totalNotas = await NotaFiscalModel.countDocuments()
  console.log(`📑 Total de notas fiscais encontradas na base: ${totalNotas}`)

  // 1. Levantamento de notas já migradas para garantir IDEMPOTÊNCIA
  const notasJaProcessadas = await HistoricoCompraModel.distinct('notaFiscalId')
  const setNotasProcessadas = new Set(
    notasJaProcessadas.map((id) => id?.toString()),
  )
  console.log(
    `ℹ️  Notas fiscais já com histórico registrado: ${setNotasProcessadas.size}`,
  )

  let notasMigradas = 0
  let notasIgnoradas = 0
  let totalItensInseridos = 0
  let erros = 0

  const batchSize = 50
  const cursor = NotaFiscalModel.find().cursor({ batchSize })

  for await (const nota of cursor) {
    const notaIdStr = nota._id.toString()

    if (setNotasProcessadas.has(notaIdStr)) {
      notasIgnoradas++
      continue
    }

    try {
      const userObjectId =
        nota.userId instanceof Types.ObjectId
          ? nota.userId
          : new Types.ObjectId(nota.userId)

      // 2. Garante o mercado/estabelecimento para referência
      const estabelecimento =
        await EstabelecimentoUsuarioModel.findOneAndUpdate(
          { userId: userObjectId, cnpj: nota.cnpj },
          {
            $setOnInsert: {
              userId: userObjectId,
              cnpj: nota.cnpj,
              nomeOriginal:
                nota.estabelecimentoOriginal || nota.estabelecimento || '',
              nomeDepara:
                nota.estabelecimentoOriginal || nota.estabelecimento || '',
            },
          },
          { upsert: true, new: true },
        )

      const mercadoId = estabelecimento._id as Types.ObjectId

      // 3. Busca os produtos associados a esta nota
      let produtos = await ProdutoModel.find({ notaFiscal: nota._id }).exec()

      // Se não encontrou por referência inversa, busca pelos IDs do array produtos
      if (
        (!produtos || produtos.length === 0) &&
        nota.produtos &&
        nota.produtos.length > 0
      ) {
        produtos = await ProdutoModel.find({
          _id: { $in: nota.produtos },
        }).exec()
      }

      if (!produtos || produtos.length === 0) {
        setNotasProcessadas.add(notaIdStr)
        continue
      }

      // 4. Mapeia cada produto para o item do HistoricoCompra
      const itensHistorico = await Promise.all(
        produtos.map(async (p) => {
          let catalogoId = p.produtoCatalogo as Types.ObjectId | null

          // Se não tiver a referência gravada, tenta checar se o código existe no catálogo
          if (!catalogoId && p.codigo && p.codigo.trim()) {
            const catalogoExistente = await ProdutoCatalogoModel.findOne({
              ean: p.codigo.trim(),
            })
              .select('_id')
              .lean()

            if (catalogoExistente) {
              catalogoId = catalogoExistente._id as Types.ObjectId
            }
          }

          return {
            usuarioId: userObjectId,
            mercadoId,
            notaFiscalId: nota._id as Types.ObjectId,
            produtoCatalogoId: catalogoId || null,
            codigoInternoMercado: p.codigo,
            descricaoBrutaNota: p.nome,
            quantidade: p.quantidade || 1,
            unidade: p.unidade || 'UN',
            precoUnitario: p.valorUnitario || 0,
            precoTotal: p.valorTotal || 0,
            dataCompra:
              nota.dataEmissao ||
              (nota as any).createdAt ||
              new Date(),
          }
        }),
      )

      if (itensHistorico.length > 0) {
        await HistoricoCompraModel.insertMany(itensHistorico)
        totalItensInseridos += itensHistorico.length
        notasMigradas++
      }

      setNotasProcessadas.add(notaIdStr)

      if (notasMigradas % 20 === 0) {
        console.log(
          `⏳ Progresso: ${notasMigradas} notas migradas (${totalItensInseridos} itens registrados)...`,
        )
      }
    } catch (err: any) {
      erros++
      console.error(
        `❌ Erro ao migrar nota fiscal ${notaIdStr}: ${err.message}`,
      )
    }
  }

  console.log('------------------------------------------------------------')
  console.log('✅ Migração para HistoricoCompra concluída!')
  console.log('📊 Relatório Final:')
  console.log(`   - Total de notas analisadas: ${totalNotas}`)
  console.log(`   - Notas migradas nesta execução: ${notasMigradas}`)
  console.log(
    `   - Notas ignoradas (já possuíam histórico): ${notasIgnoradas}`,
  )
  console.log(`   - Total de itens inseridos: ${totalItensInseridos}`)
  if (erros > 0) {
    console.log(`   - Total de notas com erro: ${erros}`)
  }
  console.log('------------------------------------------------------------')

  await mongoose.disconnect()
}

migrarParaHistoricoCompras().catch((error) => {
  console.error('❌ Erro fatal durante a migração:', error)
  process.exit(1)
})
