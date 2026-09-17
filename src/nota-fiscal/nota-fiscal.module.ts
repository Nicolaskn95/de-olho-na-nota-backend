import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { NotaFiscalController } from './nota-fiscal.controller'
import { NotaFiscalService } from './nota-fiscal.service'
import { CaptchaSolverService } from './captcha-solver.service'
import { AuthModule } from '../auth/auth.module'
import { NotaFiscal, NotaFiscalSchema } from './schemas/nota-fiscal.schema'
import { Produto, ProdutoSchema } from './schemas/produto.schema'
import {
  EstabelecimentoUsuario,
  EstabelecimentoUsuarioSchema,
} from './schemas/estabelecimento-usuario.schema'

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: NotaFiscal.name, schema: NotaFiscalSchema },
      { name: Produto.name, schema: ProdutoSchema },
      {
        name: EstabelecimentoUsuario.name,
        schema: EstabelecimentoUsuarioSchema,
      },
    ]),
  ],
  controllers: [NotaFiscalController],
  providers: [NotaFiscalService, CaptchaSolverService],
  exports: [NotaFiscalService],
})
export class NotaFiscalModule {}
