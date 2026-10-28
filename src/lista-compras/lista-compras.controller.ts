import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { ListaComprasService } from './lista-compras.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserId } from '../auth/decorators/user.decorator'
import { GerarListaDto } from './dto/gerar-lista.dto'
import { MarcarItemDto } from './dto/marcar-item.dto'
import { AdicionarItemDto } from './dto/adicionar-item.dto'
import { SalvarApelidoDto } from './dto/salvar-apelido.dto'
import { SalvarItensLoteDto } from './dto/salvar-itens-lote.dto'
import { AdicionarVozDto } from './dto/adicionar-voz.dto'
import { AtualizarRascunhoDto } from './dto/atualizar-rascunho.dto'
import { ProcessarRagDto } from './dto/processar-rag.dto'

@Controller('lista-compras')
@UseGuards(JwtAuthGuard)
export class ListaComprasController {
  constructor(private readonly listaComprasService: ListaComprasService) {}

  @Get('mercados')
  listarMercados(@UserId() userId: string) {
    return this.listaComprasService.listarMercadosComHistorico(userId)
  }

  @Get('rascunho')
  obterRascunho(@UserId() userId: string) {
    return this.listaComprasService.obterRascunho(userId)
  }

  @Post('rascunho/voz')
  adicionarItensPorVoz(
    @UserId() userId: string,
    @Body() dto: AdicionarVozDto,
  ) {
    return this.listaComprasService.adicionarItensPorVoz(userId, dto)
  }

  @Patch('rascunho')
  atualizarRascunho(
    @UserId() userId: string,
    @Body() dto: AtualizarRascunhoDto,
  ) {
    return this.listaComprasService.atualizarRascunho(userId, dto)
  }

  @Delete('rascunho')
  limparRascunho(@UserId() userId: string) {
    return this.listaComprasService.limparRascunho(userId)
  }

  @Post('processar-rag')
  processarListaComRag(
    @UserId() userId: string,
    @Body() dto: ProcessarRagDto,
  ) {
    return this.listaComprasService.processarListaComRag(userId, dto)
  }

  @Post('voz-ativa')
  adicionarVozNaListaAtiva(
    @UserId() userId: string,
    @Body() dto: AdicionarVozDto,
  ) {
    return this.listaComprasService.adicionarVozNaListaAtiva(userId, dto)
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
  salvarItensEmLote(@UserId() userId: string, @Body() dto: SalvarItensLoteDto) {
    return this.listaComprasService.salvarItensEmLote(userId, dto)
  }

  @Delete('item/:index')
  removerItem(@UserId() userId: string, @Param('index') index: string) {
    return this.listaComprasService.removerItem(userId, +index)
  }

  @Post('item')
  adicionarItem(@UserId() userId: string, @Body() dto: AdicionarItemDto) {
    return this.listaComprasService.adicionarItem(userId, dto)
  }

  @Delete()
  excluirLista(@UserId() userId: string) {
    return this.listaComprasService.excluirLista(userId)
  }

  @Post('apelidos')
  salvarApelido(@UserId() userId: string, @Body() dto: SalvarApelidoDto) {
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
