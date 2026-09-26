import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, HydratedDocument, Types } from 'mongoose'

export type HistoricoCompraDocument = HydratedDocument<HistoricoCompra>

@Schema({
  timestamps: true,
  collection: 'historicos_compras',
})
export class HistoricoCompra extends Document {
  // ================= Relacionamentos (Foreign Keys / Pivot) =================
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  usuarioId: Types.ObjectId

  @Prop({
    type: Types.ObjectId,
    ref: 'EstabelecimentoUsuario',
    required: true,
  })
  mercadoId: Types.ObjectId

  @Prop({
    type: Types.ObjectId,
    ref: 'NotaFiscal',
    required: true,
  })
  notaFiscalId: Types.ObjectId

  // ================= Metadados do Item Comprado =================
  /**
   * Referência ao catálogo global (quando o item possui EAN identificado).
   * Opcional (null quando for produto de hortifrúti/padaria sem código de barras global).
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'ProdutoCatalogo',
    required: false,
    default: null,
  })
  produtoCatalogoId?: Types.ObjectId | null

  /** Código interno (cProd da NF-e/NFC-e) atribuído pelo estabelecimento */
  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  codigoInternoMercado?: string

  /** Descrição textual conforme emitida no cupom fiscal (xProd) */
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  descricaoBrutaNota: string

  // ================= Dados Financeiros e Métricas =================
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  quantidade: number

  @Prop({
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  })
  unidade: string

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  precoUnitario: number

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  precoTotal: number

  @Prop({
    type: Date,
    required: true,
  })
  dataCompra: Date
}

export const HistoricoCompraSchema =
  SchemaFactory.createForClass(HistoricoCompra)

// ================= Índices Compostos de Performance =================

/**
 * Consulta 1: Histórico de Compras de um Usuário
 * Otimiza consultas filtrando por usuário e ordenando/filtrando por data (mais recentes primeiro).
 * Segue a regra ESR (Equality: usuarioId, Sort/Range: dataCompra).
 */
HistoricoCompraSchema.index(
  { usuarioId: 1, dataCompra: -1 },
  { name: 'idx_usuario_data_compra' },
)

/**
 * Consulta 2: Radar de Preços Comunitário por Produto / Mercado
 * Otimiza buscas pelo catálogo global filtrando por mercado e janela de data.
 * Permite agregação rápida e range queries de preços históricos por produto.
 */
HistoricoCompraSchema.index(
  { produtoCatalogoId: 1, mercadoId: 1, dataCompra: -1 },
  { name: 'idx_catalogo_mercado_data' },
)
