import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '../auth/auth.module'
import { CategoriaController } from './categoria.controller'
import { CategoriaService } from './categoria.service'
import { CategoriaSeed } from './categoria.seed'
import { Categoria, CategoriaSchema } from './schemas/categoria.schema'
import { Prefixo, PrefixoSchema } from './schemas/prefixo-categoria.schema'
import { NotaFiscal, NotaFiscalSchema } from '../nota-fiscal/schemas/nota-fiscal.schema'
import { Produto, ProdutoSchema } from '../nota-fiscal/schemas/produto.schema'
import { DuracaoMediaModule } from '../duracao-media/duracao-media.module'

@Module({
  imports: [
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
  providers: [CategoriaService, CategoriaSeed],
  exports: [CategoriaService, MongooseModule],
})
export class CategoriaModule {}
