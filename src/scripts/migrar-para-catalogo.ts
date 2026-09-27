import * as dotenv from 'dotenv'
import mongoose from 'mongoose'
import { ProdutoSchema } from '../nota-fiscal/schemas/produto.schema'
import { ProdutoCatalogoSchema } from '../produto-catalogo/schemas/produto-catalogo.schema'
import { HistoricoCompraSchema } from '../historico-compra/schemas/historico-compra.schema'
import {
  sanitizarDescricaoProduto,
  gerarChaveCanonica,
  isEanValido,
} from '../produto-catalogo/utils/sanitizar-produto.util'

dotenv.config()

async function migrarParaCatalogo() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/deOlhoNaNota'

  console.log('------------------------------------------------------------')
  console.log('🚀 Iniciando script de migração para o Catálogo Global...')
  console.log(`🔌 Conectando ao MongoDB: ${mongoUri}`)
  console.log('------------------------------------------------------------')

  await mongoose.connect(mongoUri)

  const ProdutoModel = mongoose.model('Produto', ProdutoSchema)
  const ProdutoCatalogoModel = mongoose.model(
    'ProdutoCatalogo',
    ProdutoCatalogoSchema,
  )
  const HistoricoCompraModel = mongoose.model(
    'HistoricoCompra',
    HistoricoCompraSchema,
  )

  const totalProdutos = await ProdutoModel.countDocuments()
  console.log(`📦 Total de produtos encontrados na base: ${totalProdutos}`)

  let produtosVinculados = 0
  let novosNoCatalogo = 0
  let existentesNoCatalogo = 0
  let historicosAtualizados = 0

  const batchSize = 100
  let processados = 0

  const cursor = ProdutoModel.find().cursor({ batchSize })

  for await (const prod of cursor) {
    processados++

    const codigo = prod.codigo
    const nome = prod.nome

    const nomeSanitizado = sanitizarDescricaoProduto(nome || '')
    if (!nomeSanitizado) {
      continue
    }

    const chaveCanonica = gerarChaveCanonica(codigo, nomeSanitizado)
    const eanLimpo = isEanValido(codigo) ? codigo.trim() : null

    // Verifica se já existia previamente no catálogo para estatística
    const jaExistia = await ProdutoCatalogoModel.exists({ chaveCanonica })

    const catalogoDoc = await ProdutoCatalogoModel.findOneAndUpdate(
      { chaveCanonica },
      {
        $setOnInsert: {
          chaveCanonica,
          ean: eanLimpo,
          nomePadronizado: nomeSanitizado,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    )

    if (jaExistia) {
      existentesNoCatalogo++
    } else {
      novosNoCatalogo++
    }

    // Vincula o produto da nota ao documento do catálogo global
    await ProdutoModel.updateOne(
      { _id: prod._id },
      { $set: { produtoCatalogo: catalogoDoc._id } },
    )

    // Atualiza também itens de HistoricoCompra correspondentes
    const resHistorico = await HistoricoCompraModel.updateMany(
      {
        $or: [
          { notaFiscalId: prod.notaFiscal, codigoInternoMercado: prod.codigo },
          { notaFiscalId: prod.notaFiscal, descricaoBrutaNota: prod.nome },
        ],
        produtoCatalogoId: null,
      },
      {
        $set: { produtoCatalogoId: catalogoDoc._id },
      },
    )

    historicosAtualizados += resHistorico.modifiedCount
    produtosVinculados++

    if (processados % 100 === 0 || processados === totalProdutos) {
      console.log(`⏳ Progresso: ${processados}/${totalProdutos} analisados...`)
    }
  }

  console.log('------------------------------------------------------------')
  console.log('✅ Migração para o Catálogo Global concluída com sucesso!')
  console.log('📊 Relatório Final:')
  console.log(`   - Total de produtos analisados: ${processados}`)
  console.log(`   - Produtos vinculados ao catálogo: ${produtosVinculados}`)
  console.log(`     * Novos itens inseridos no catálogo: ${novosNoCatalogo}`)
  console.log(
    `     * Itens que já existiam no catálogo: ${existentesNoCatalogo}`,
  )
  console.log(
    `   - Itens de HistoricoCompra atualizados com catalogoId: ${historicosAtualizados}`,
  )
  console.log('------------------------------------------------------------')

  await mongoose.disconnect()
}

migrarParaCatalogo().catch((error) => {
  console.error('❌ Erro durante a migração:', error)
  process.exit(1)
})
