import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  HistoricoCompra,
  HistoricoCompraSchema,
} from './schemas/historico-compra.schema'
import { HistoricoCompraService } from './historico-compra.service'
import { HistoricoCompraController } from './historico-compra.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: HistoricoCompra.name, schema: HistoricoCompraSchema },
    ]),
  ],
  controllers: [HistoricoCompraController],
  providers: [HistoricoCompraService],
  exports: [HistoricoCompraService, MongooseModule],
})
export class HistoricoCompraModule {}
