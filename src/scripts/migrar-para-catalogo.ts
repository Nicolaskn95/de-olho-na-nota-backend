import * as dotenv from 'dotenv'
import mongoose from 'mongoose'
import { ProdutoSchema } from '../nota-fiscal/schemas/produto.schema'
import { ProdutoCatalogoSchema } from '../produto-catalogo/schemas/produto-catalogo.schema'

dotenv.config()

/**
 * Validação de EAN idêntica às regras do ProdutoCatalogoService
 */
function isEanValido(ean?: string | null): boolean {
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

  if (!/^\d+$/.test(valorNormalizado)) {
    return false
  }

  const tamanho = valorNormalizado.length
  if (![8, 12, 13, 14].includes(tamanho)) {
    return false
  }

  if (tamanho === 13 && valorNormalizado.startsWith('2')) {
    return false
  }

  return true
}

async function migrarParaCatalogo() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/deOlhoNaNota'

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

  const totalProdutos = await ProdutoModel.countDocuments()
  console.log(`📦 Total de produtos encontrados na base: ${totalProdutos}`)

  let produtosVinculados = 0
  let produtosIgnorados = 0
  let novosNoCatalogo = 0
  let existentesNoCatalogo = 0

  const batchSize = 100
  let processados = 0

  const cursor = ProdutoModel.find().cursor({ batchSize })

  for await (const prod of cursor) {
    processados++

    const codigo = prod.codigo
    const nome = prod.nome

    if (!isEanValido(codigo) || !nome || !nome.trim()) {
      produtosIgnorados++
      continue
    }

    const eanLimpo = codigo.trim()
    const nomeLimpo = nome.trim()

    // Verifica se já existia previamente no catálogo para estatística
    const jaExistia = await ProdutoCatalogoModel.exists({ ean: eanLimpo })

    const catalogoDoc = await ProdutoCatalogoModel.findOneAndUpdate(
      { ean: eanLimpo },
      {
        $setOnInsert: {
          ean: eanLimpo,
          nomePadronizado: nomeLimpo,
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
    `   - Produtos ignorados (sem cEAN ou pesagem interna): ${produtosIgnorados}`,
  )
  console.log('------------------------------------------------------------')

  await mongoose.disconnect()
}

migrarParaCatalogo().catch((error) => {
  console.error('❌ Erro durante a migração:', error)
  process.exit(1)
})
