import * as dotenv from 'dotenv'
import mongoose, { Schema, Types } from 'mongoose'

dotenv.config()

/**
 * Normaliza o CNPJ removendo qualquer caractere não numérico.
 */
function sanitizarCnpj(cnpj?: string | null): string {
  return cnpj ? cnpj.replace(/\D/g, '').trim() : ''
}

/**
 * Normaliza o CEP removendo pontuação.
 */
function sanitizarCep(cep?: string | null): string | undefined {
  if (!cep) return undefined
  const limpo = cep.replace(/\D/g, '').trim()
  return limpo.length > 0 ? limpo : undefined
}

interface EnderecoEstruturado {
  rua?: string
  numero?: string
  bairro?: string
  cidade?: string
  uf?: string
}

/**
 * Tenta quebrar string bruta de endereço nos campos estruturados.
 */
function parseEndereco(enderecoStr?: string | null): EnderecoEstruturado | undefined {
  if (!enderecoStr || typeof enderecoStr !== 'string') return undefined
  const limpo = enderecoStr.replace(/\s+/g, ' ').trim()
  if (!limpo) return undefined

  const match = limpo.match(
    /^(.*?),\s*(\d+|S\/N)\s*[-,\s]*(.*?)[-,\s]+([A-Za-zÀ-ÿ\s]+)[-,\s/]+([A-Z]{2})$/i,
  )
  if (match) {
    return {
      rua: match[1]?.trim(),
      numero: match[2]?.trim(),
      bairro: match[3]?.trim(),
      cidade: match[4]?.trim(),
      uf: match[5]?.trim().toUpperCase(),
    }
  }

  return {
    rua: limpo,
  }
}

// Definição dos Schemas Mongoose para execução autônoma do script
const EnderecoMercadoSchema = new Schema(
  {
    rua: { type: String, trim: true },
    numero: { type: String, trim: true },
    bairro: { type: String, trim: true },
    cidade: { type: String, trim: true },
    uf: { type: String, trim: true, uppercase: true },
  },
  { _id: false },
)

const MercadoSchema = new Schema(
  {
    cnpj: { type: String, required: true, unique: true, index: true, trim: true },
    razaoSocial: { type: String, trim: true },
    nomeFantasia: { type: String, trim: true },
    endereco: { type: EnderecoMercadoSchema, default: () => ({}) },
    cep: { type: String, trim: true },
  },
  { timestamps: true, collection: 'mercados' },
)

async function migrarMercadosAntigos() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/de-olho-na-nota'

  console.log('------------------------------------------------------------')
  console.log('🚀 Iniciando script de migração de Mercados Globais...')
  console.log(`🔌 Conectando ao MongoDB: ${mongoUri}`)
  console.log('------------------------------------------------------------')

  await mongoose.connect(mongoUri)

  const db = mongoose.connection.db
  if (!db) {
    throw new Error('Falha ao obter conexão com o banco de dados.')
  }

  // Model de Mercado registrado no Mongoose
  const MercadoModel =
    mongoose.models.Mercado || mongoose.model('Mercado', MercadoSchema)

  // Acessa as coleções diretamente para máxima compatibilidade
  const notafiscalsCol = db.collection('notafiscals')

  const totalNotas = await notafiscalsCol.countDocuments()
  console.log(`📑 Total de notas fiscais na base: ${totalNotas}`)

  // Filtra notas que ainda não possuem o mercadoId vinculado
  const notasPendentes = await notafiscalsCol
    .find({
      $or: [{ mercadoId: { $exists: false } }, { mercadoId: null }],
    })
    .toArray()

  console.log(
    `🔍 Notas fiscais pendentes de vínculo com Mercado: ${notasPendentes.length}`,
  )

  let mercadosCriadosOuAtualizados = 0
  let notasAtualizadas = 0
  let notasIgnoradasSemCnpj = 0
  let erros = 0

  for (const nota of notasPendentes) {
    const cnpjLimpo = sanitizarCnpj(nota.cnpj)

    if (!cnpjLimpo) {
      notasIgnoradasSemCnpj++
      continue
    }

    try {
      const updateFields: Record<string, any> = {
        cnpj: cnpjLimpo,
      }

      const nomeEstabelecimento =
        nota.estabelecimento || nota.estabelecimentoOriginal
      if (nomeEstabelecimento) {
        updateFields.razaoSocial = nomeEstabelecimento.trim()
        updateFields.nomeFantasia = nomeEstabelecimento.trim()
      }

      const enderecoEstruturado = parseEndereco(nota.endereco)
      if (enderecoEstruturado) {
        updateFields.endereco = enderecoEstruturado
      }

      // Upsert atômico do mercado global único por CNPJ
      const mercado = await MercadoModel.findOneAndUpdate(
        { cnpj: cnpjLimpo },
        { $set: updateFields },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )

      mercadosCriadosOuAtualizados++

      // Atualiza a nota fiscal vinculando o mercadoId
      await notafiscalsCol.updateOne(
        { _id: nota._id },
        { $set: { mercadoId: mercado._id } },
      )

      notasAtualizadas++
    } catch (err) {
      erros++
      console.error(
        `❌ Erro ao processar nota ${nota._id} (CNPJ: ${nota.cnpj}):`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  const totalFinalMercados = await MercadoModel.countDocuments()

  console.log('------------------------------------------------------------')
  console.log('✅ Migração de Mercados concluída com sucesso!')
  console.log('📊 Relatório Final:')
  console.log(`   - Notas analisadas: ${notasPendentes.length}`)
  console.log(`   - Notas vinculadas com mercadoId: ${notasAtualizadas}`)
  console.log(`   - Notas sem CNPJ (ignoradas): ${notasIgnoradasSemCnpj}`)
  console.log(`   - Erros encontrados: ${erros}`)
  console.log(`   - Total de Mercados únicos na base global: ${totalFinalMercados}`)
  console.log('------------------------------------------------------------')

  await mongoose.disconnect()
}

migrarMercadosAntigos().catch((err) => {
  console.error('💥 Erro fatal durante a migração:', err)
  process.exit(1)
})
