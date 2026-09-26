import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, HydratedDocument } from 'mongoose'

export type MercadoDocument = HydratedDocument<Mercado>

@Schema({ _id: false })
export class EnderecoMercado {
  @Prop({ type: String, trim: true })
  rua?: string

  @Prop({ type: String, trim: true })
  numero?: string

  @Prop({ type: String, trim: true })
  bairro?: string

  @Prop({ type: String, trim: true })
  cidade?: string

  @Prop({ type: String, trim: true, uppercase: true })
  uf?: string
}

export const EnderecoMercadoSchema =
  SchemaFactory.createForClass(EnderecoMercado)

@Schema({ timestamps: true, collection: 'mercados' })
export class Mercado extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  cnpj: string

  @Prop({ trim: true })
  razaoSocial?: string

  @Prop({ trim: true })
  nomeFantasia?: string

  @Prop({ type: EnderecoMercadoSchema, default: () => ({}) })
  endereco?: EnderecoMercado

  @Prop({ trim: true })
  cep?: string
}

export const MercadoSchema = SchemaFactory.createForClass(Mercado)

MercadoSchema.index({ cnpj: 1 }, { unique: true })
