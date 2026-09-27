import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from '../auth/auth.module'
import { CategoriaController } from './categoria.controller'
import { CategoriaService } from './categoria.service'
import { CategorizadorClientService } from './categorizador-client.service'
import { CategoriaSeed } from './categoria.seed'
import { Categoria, CategoriaSchema } from './schemas/categoria.schema'
import { Prefixo, PrefixoSchema } from './schemas/prefixo-categoria.schema'
import {
  NotaFiscal,
  NotaFiscalSchema,
} from '../nota-fiscal/schemas/nota-fiscal.schema'
import { Produto, ProdutoSchema } from '../nota-fiscal/schemas/produto.schema'
import { DuracaoMediaModule } from '../duracao-media/duracao-media.module'

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    DuracaoMediaModule,
    MongooseModule.forFeature([
      { name: Categoria.name, schema: CategoriaSchema },
      { name: Prefixo.name, schema: PrefixoSchema },
      { name: NotaFiscal.name, schema: NotaFiscalSchema },
      { name: Produto.name, schema: ProdutoSchema },
    ]),
  ],
  controllers: [CategoriaController],
  providers: [CategoriaService, CategorizadorClientService, CategoriaSeed],
  exports: [CategoriaService, CategorizadorClientService, MongooseModule],
})
export class CategoriaModule {}
