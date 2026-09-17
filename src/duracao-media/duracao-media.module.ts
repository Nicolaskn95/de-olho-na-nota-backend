import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '../auth/auth.module'
import { DuracaoMediaController } from './duracao-media.controller'
import { DuracaoMediaService } from './duracao-media.service'
import { QwenAiService } from './qwen-ai.service'
import {
  NotaFiscal,
  NotaFiscalSchema,
} from '../nota-fiscal/schemas/nota-fiscal.schema'
import { Produto, ProdutoSchema } from '../nota-fiscal/schemas/produto.schema'
import {
  Prefixo,
  PrefixoSchema,
} from '../categoria/schemas/prefixo-categoria.schema'
import {
  Categoria,
  CategoriaSchema,
} from '../categoria/schemas/categoria.schema'

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: NotaFiscal.name, schema: NotaFiscalSchema },
      { name: Produto.name, schema: ProdutoSchema },
      { name: Prefixo.name, schema: PrefixoSchema },
      { name: Categoria.name, schema: CategoriaSchema },
    ]),
  ],
  controllers: [DuracaoMediaController],
  providers: [DuracaoMediaService, QwenAiService],
  exports: [QwenAiService],
})
export class DuracaoMediaModule {}
