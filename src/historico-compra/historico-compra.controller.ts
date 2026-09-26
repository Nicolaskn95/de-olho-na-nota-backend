import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { HistoricoCompraService } from './historico-compra.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { EstatisticasPrecoProduto } from './interfaces/historico-compra.interface'

@Controller('historico-compra')
@UseGuards(JwtAuthGuard)
export class HistoricoCompraController {
  constructor(
    private readonly historicoCompraService: HistoricoCompraService,
  ) {}

  @Get('produto/:id/estatisticas')
  async buscarEvolucaoPrecoProduto(
    @Param('id') id: string,
  ): Promise<EstatisticasPrecoProduto | null> {
    return this.historicoCompraService.buscarEvolucaoPrecoProduto(id)
  }
}
