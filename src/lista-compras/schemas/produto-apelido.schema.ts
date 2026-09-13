import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class ProdutoApelido extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId

  @Prop({ required: true })
  nomeOriginal: string

  @Prop({ required: true })
  apelido: string
}

export const ProdutoApelidoSchema = SchemaFactory.createForClass(ProdutoApelido)

ProdutoApelidoSchema.index({ userId: 1, nomeOriginal: 1 }, { unique: true })
