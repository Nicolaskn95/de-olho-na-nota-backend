import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ _id: false })
export class ItemRascunho {
  @Prop({ required: true })
  termoFalado: string

  @Prop({ required: true, default: 1 })
  quantidade: number

  @Prop({ required: true, default: 'UN' })
  unidade: string

  @Prop({ default: () => new Date() })
  adicionadoEm: Date
}

export const ItemRascunhoSchema = SchemaFactory.createForClass(ItemRascunho)

@Schema({ timestamps: true })
export class RascunhoListaCompras extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId

  @Prop({ type: [ItemRascunhoSchema], default: [] })
  itens: ItemRascunho[]
}

export const RascunhoListaComprasSchema =
  SchemaFactory.createForClass(RascunhoListaCompras)
