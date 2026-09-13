import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { NotaFiscalModule } from './nota-fiscal/nota-fiscal.module'
import { CategoriaModule } from './categoria/categoria.module'
import { AuthModule } from './auth/auth.module'
import { DuracaoMediaModule } from './duracao-media/duracao-media.module'
import { ListaComprasModule } from './lista-compras/lista-compras.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/deOlhoNaNota',
        ),
      }),
    }),
    NotaFiscalModule,
    CategoriaModule,
    AuthModule,
    DuracaoMediaModule,
    ListaComprasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
