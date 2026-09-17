import { Test, TestingModule } from '@nestjs/testing'
import { CategoriaController } from './categoria.controller'
import { CategoriaService } from './categoria.service'

describe('CategoriaController', () => {
  let controller: CategoriaController
  let service: Record<string, jest.Mock>

  beforeEach(async () => {
    service = {
      listarCategorias: jest.fn(),
      classificarProdutosComIa: jest.fn(),
      listarPrefixos: jest.fn(),
      criarPrefixo: jest.fn(),
      importarPrefixos: jest.fn(),
      atualizarPrefixo: jest.fn(),
      removerPrefixo: jest.fn(),
      buscarCategoriaPorId: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriaController],
      providers: [
        {
          provide: CategoriaService,
          useValue: service,
        },
      ],
    }).compile()

    controller = module.get<CategoriaController>(CategoriaController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should call listarCategorias', async () => {
    service.listarCategorias.mockResolvedValue([{ id: 'cat-1', nome: 'Alimentação' }])
    const result = await controller.listarCategorias()
    expect(service.listarCategorias).toHaveBeenCalled()
    expect(result).toEqual([{ id: 'cat-1', nome: 'Alimentação' }])
  })

  it('should call classificarComIa', async () => {
    const dto = { produtos: ['ARROZ 5KG'] }
    service.classificarProdutosComIa.mockResolvedValue([])
    const result = await controller.classificarComIa('user-1', dto)
    expect(service.classificarProdutosComIa).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual([])
  })

  it('should call listarPrefixos', async () => {
    service.listarPrefixos.mockResolvedValue([])
    const result = await controller.listarPrefixos('user-1')
    expect(service.listarPrefixos).toHaveBeenCalledWith('user-1')
    expect(result).toEqual([])
  })

  it('should call criarPrefixo', async () => {
    const dto = { prefixo: 'LEITE', categoriaId: 'cat-1' }
    service.criarPrefixo.mockResolvedValue({ id: 'p1', prefixo: 'LEITE' })
    const result = await controller.criarPrefixo('user-1', dto)
    expect(service.criarPrefixo).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual({ id: 'p1', prefixo: 'LEITE' })
  })

  it('should call importarPrefixos', async () => {
    const dto = { prefixos: [{ prefixo: 'PAO', categoriaId: 'cat-1' }] }
    service.importarPrefixos.mockResolvedValue({ criados: 1, ignorados: 0, erros: [], prefixos: [] })
    const result = await controller.importarPrefixos('user-1', dto)
    expect(service.importarPrefixos).toHaveBeenCalledWith('user-1', dto)
    expect(result.criados).toBe(1)
  })

  it('should call atualizarPrefixo', async () => {
    const dto = { prefixo: 'LEITE DESNATADO', categoriaId: 'cat-1' }
    service.atualizarPrefixo.mockResolvedValue({ id: 'p1' })
    const result = await controller.atualizarPrefixo('user-1', 'p1', dto)
    expect(service.atualizarPrefixo).toHaveBeenCalledWith('user-1', 'p1', dto)
    expect(result).toEqual({ id: 'p1' })
  })

  it('should call removerPrefixo', async () => {
    service.removerPrefixo.mockResolvedValue({ ok: true })
    const result = await controller.removerPrefixo('user-1', 'p1')
    expect(service.removerPrefixo).toHaveBeenCalledWith('user-1', 'p1')
    expect(result).toEqual({ ok: true })
  })

  it('should call buscarCategoria', async () => {
    service.buscarCategoriaPorId.mockResolvedValue({ id: 'cat-1', nome: 'Alimentação' })
    const result = await controller.buscarCategoria('cat-1')
    expect(service.buscarCategoriaPorId).toHaveBeenCalledWith('cat-1')
    expect(result).toEqual({ id: 'cat-1', nome: 'Alimentação' })
  })
})
