import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import { CategoriaService } from './categoria.service'
import { CriarPrefixoDto } from './dto/criar-prefixo.dto'
import { ImportarPrefixosDto } from './dto/importar-prefixos.dto'
import { ClassificarProdutosIaDto } from './dto/classificar-produtos-ia.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserId } from '../auth/decorators/user.decorator'

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  // ========== CATEGORIAS ==========

  @Get()
  listarCategorias() {
    return this.categoriaService.listarCategorias()
  }

  @Post('classificar-ia')
  @UseGuards(JwtAuthGuard)
  classificarComIa(
    @UserId() userId: string,
    @Body() dto: ClassificarProdutosIaDto,
  ) {
    return this.categoriaService.classificarProdutosComIa(userId, dto)
  }

  // ========== PREFIXOS (rotas estáticas antes de :id) ==========

  @Get('prefixos/listar')
  @UseGuards(JwtAuthGuard)
  listarPrefixos(@UserId() userId: string) {
    return this.categoriaService.listarPrefixos(userId)
  }

  @Post('prefixos')
  @UseGuards(JwtAuthGuard)
  criarPrefixo(@UserId() userId: string, @Body() dto: CriarPrefixoDto) {
    return this.categoriaService.criarPrefixo(userId, dto)
  }

  @Post('prefixos/importar')
  @UseGuards(JwtAuthGuard)
  importarPrefixos(
    @UserId() userId: string,
    @Body() dto: ImportarPrefixosDto,
  ) {
    return this.categoriaService.importarPrefixos(userId, dto)
  }

  @Put('prefixos/:id')
  @UseGuards(JwtAuthGuard)
  atualizarPrefixo(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CriarPrefixoDto,
  ) {
    return this.categoriaService.atualizarPrefixo(userId, id, dto)
  }

  @Delete('prefixos/:id')
  @UseGuards(JwtAuthGuard)
  removerPrefixo(@UserId() userId: string, @Param('id') id: string) {
    return this.categoriaService.removerPrefixo(userId, id)
  }

  @Get(':id')
  buscarCategoria(@Param('id') id: string) {
    return this.categoriaService.buscarCategoriaPorId(id)
  }
}