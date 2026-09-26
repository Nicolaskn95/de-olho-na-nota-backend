import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class Produto extends Document {
  @Prop({ required: true })
  nome: string

  @Prop({ required: true })
  codigo: string

  @Prop({ required: true })
  quantidade: number

  @Prop({ required: true })
  unidade: string

  @Prop({ required: true })
  valorUnitario: number

  @Prop({ required: true })
  valorTotal: number

  @Prop({ type: Types.ObjectId, ref: 'NotaFiscal' })
  notaFiscal: Types.ObjectId

  @Prop({
    type: Types.ObjectId,
    ref: 'ProdutoCatalogo',
    required: false,
    default: null,
  })
  produtoCatalogo?: Types.ObjectId
}

export const ProdutoSchema = SchemaFactory.createForClass(Produto)
