import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { CategoriaModule } from '../categoria/categoria.module'
import {
  ProdutoCatalogo,
  ProdutoCatalogoSchema,
} from './schemas/produto-catalogo.schema'
import { ProdutoCatalogoService } from './produto-catalogo.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProdutoCatalogo.name, schema: ProdutoCatalogoSchema },
    ]),
    CategoriaModule,
  ],
  providers: [ProdutoCatalogoService],
  exports: [ProdutoCatalogoService, MongooseModule],
})
export class ProdutoCatalogoModule {}
