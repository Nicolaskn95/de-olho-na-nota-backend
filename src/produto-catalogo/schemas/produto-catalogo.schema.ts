import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, HydratedDocument, Types } from 'mongoose'
import { Categoria } from '../../categoria/schemas/categoria.schema'

export type ProdutoCatalogoDocument = HydratedDocument<ProdutoCatalogo>

@Schema({ timestamps: true, collection: 'produtos_catalogo' })
export class ProdutoCatalogo extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  chaveCanonica: string

  @Prop({
    type: String,
    required: false,
    trim: true,
    default: null,
  })
  ean?: string | null

  @Prop({
    required: true,
    trim: true,
  })
  nomePadronizado: string

  @Prop({
    type: Types.ObjectId,
    ref: 'Categoria',
    required: false,
    default: null,
  })
  categoria?: Types.ObjectId | Categoria
}

export const ProdutoCatalogoSchema =
  SchemaFactory.createForClass(ProdutoCatalogo)

ProdutoCatalogoSchema.index({ chaveCanonica: 1 }, { unique: true })
ProdutoCatalogoSchema.index({ ean: 1 }, { sparse: true })
