import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { HistoricoCompraService } from './historico-compra.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserId } from '../auth/decorators/user.decorator'
import {
  EstatisticasPrecoProduto,
  ProdutoAgrupadoResponse,
} from './interfaces/historico-compra.interface'

@Controller('historico-compra')
@UseGuards(JwtAuthGuard)
export class HistoricoCompraController {
  constructor(
    private readonly historicoCompraService: HistoricoCompraService,
  ) {}

  @Get('produtos-agrupados')
  async listarProdutosAgrupados(
    @UserId() userId: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ): Promise<ProdutoAgrupadoResponse[]> {
    return this.historicoCompraService.listarProdutosAgrupados(
      userId,
      dataInicio,
      dataFim,
    )
  }

  @Get('produto/:id/estatisticas')
  async buscarEvolucaoPrecoProduto(
    @Param('id') id: string,
  ): Promise<EstatisticasPrecoProduto | null> {
    return this.historicoCompraService.buscarEvolucaoPrecoProduto(id)
  }
}
