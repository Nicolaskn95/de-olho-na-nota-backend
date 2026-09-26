import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Mercado, MercadoSchema } from './schemas/mercado.schema'
import { MercadoService } from './mercado.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Mercado.name, schema: MercadoSchema },
    ]),
  ],
  providers: [MercadoService],
  exports: [MercadoService, MongooseModule],
})
export class MercadoModule {}
