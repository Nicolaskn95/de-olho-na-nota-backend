import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ListaComprasService } from './lista-compras.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserId } from '../auth/decorators/user.decorator'
import { GerarListaDto } from './dto/gerar-lista.dto'
import { MarcarItemDto } from './dto/marcar-item.dto'
import { AdicionarItemDto } from './dto/adicionar-item.dto'
import { SalvarApelidoDto } from './dto/salvar-apelido.dto'
import { SalvarItensLoteDto } from './dto/salvar-itens-lote.dto'

@Controller('lista-compras')
@UseGuards(JwtAuthGuard)
export class ListaComprasController {
  constructor(private readonly listaComprasService: ListaComprasService) {}

  @Get('mercados')
  listarMercados(@UserId() userId: string) {
    return this.listaComprasService.listarMercadosComHistorico(userId)
  }

  @Post('gerar')
  gerarLista(@UserId() userId: string, @Body() dto: GerarListaDto) {
    return this.listaComprasService.gerarLista(userId, dto)
  }

  @Get()
  obterLista(@UserId() userId: string) {
    return this.listaComprasService.obterLista(userId)
  }

  @Patch('item/:index')
  marcarItem(
    @UserId() userId: string,
    @Param('index') index: string,
    @Body() dto: MarcarItemDto,
  ) {
    return this.listaComprasService.marcarItem(userId, +index, dto)
  }

  @Patch('itens')
  salvarItensEmLote(
    @UserId() userId: string,
    @Body() dto: SalvarItensLoteDto,
  ) {
    return this.listaComprasService.salvarItensEmLote(userId, dto)
  }

  @Delete('item/:index')
  removerItem(@UserId() userId: string, @Param('index') index: string) {
    return this.listaComprasService.removerItem(userId, +index)
  }

  @Post('item')
  adicionarItem(
    @UserId() userId: string,
    @Body() dto: AdicionarItemDto,
  ) {
    return this.listaComprasService.adicionarItem(userId, dto)
  }

  @Delete()
  excluirLista(@UserId() userId: string) {
    return this.listaComprasService.excluirLista(userId)
  }

  @Post('apelidos')
  salvarApelido(
    @UserId() userId: string,
    @Body() dto: SalvarApelidoDto,
  ) {
    return this.listaComprasService.salvarApelido(userId, dto)
  }

  @Get('apelidos')
  listarApelidos(@UserId() userId: string) {
    return this.listaComprasService.listarApelidos(userId)
  }

  @Delete('apelidos/:id')
  removerApelido(@UserId() userId: string, @Param('id') id: string) {
    return this.listaComprasService.removerApelido(userId, id)
  }
}
