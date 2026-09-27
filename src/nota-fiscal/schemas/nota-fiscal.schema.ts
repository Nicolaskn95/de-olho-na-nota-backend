import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class NotaFiscal extends Document {
  @Prop({ required: true })
  chaveAcesso: string

  // ID do usuário logado que escaneou/cadastrou a nota fiscal (vem do JWT "sub").
  @Prop({ required: true, index: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId

  // ID do mercado global único por CNPJ
  @Prop({ type: Types.ObjectId, ref: 'Mercado', required: false, index: true })
  mercadoId?: Types.ObjectId

  @Prop({ required: true })
  numero: string

  @Prop({ required: true })
  serie: string

  @Prop({ required: true })
  dataEmissao: Date

  @Prop({ required: true })
  estabelecimento: string

  /** Nome do estabelecimento extraído da nota (não alterar ao aplicar de-para). */
  @Prop()
  estabelecimentoOriginal?: string

  @Prop({ required: true })
  cnpj: string

  @Prop()
  endereco: string

  @Prop({ required: true })
  valorTotal: number

  @Prop({ default: 0 })
  descontos: number

  @Prop({ required: true })
  valorPago: number

  @Prop()
  formaPagamento: string

  @Prop()
  tipoPagamento?: string

  @Prop()
  cartaoUsado?: string

  @Prop({ default: 0 })
  valorTributos?: number

  @Prop({ type: Object, default: {} })
  tributosDetalhados?: {
    federal?: number
    estadual?: number
    municipal?: number
  }

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Produto' }] })
  produtos: Types.ObjectId[]

  @Prop({ required: true })
  urlOriginal: string
}

export const NotaFiscalSchema = SchemaFactory.createForClass(NotaFiscal)

NotaFiscalSchema.index(
  { chaveAcesso: 1, userId: 1 },
  { unique: true, sparse: true },
)
