import { Test, TestingModule } from '@nestjs/testing'
import { ListaComprasController } from './lista-compras.controller'
import { ListaComprasService } from './lista-compras.service'

describe('ListaComprasController', () => {
  let controller: ListaComprasController
  let service: Record<string, jest.Mock>

  beforeEach(async () => {
    service = {
      listarMercadosComHistorico: jest.fn(),
      gerarLista: jest.fn(),
      obterLista: jest.fn(),
      marcarItem: jest.fn(),
      salvarItensEmLote: jest.fn(),
      removerItem: jest.fn(),
      adicionarItem: jest.fn(),
      excluirLista: jest.fn(),
      salvarApelido: jest.fn(),
      listarApelidos: jest.fn(),
      removerApelido: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListaComprasController],
      providers: [
        {
          provide: ListaComprasService,
          useValue: service,
        },
      ],
    }).compile()

    controller = module.get<ListaComprasController>(ListaComprasController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should call listarMercados', async () => {
    service.listarMercadosComHistorico.mockResolvedValue([])
    const result = await controller.listarMercados('user-1')
    expect(service.listarMercadosComHistorico).toHaveBeenCalledWith('user-1')
    expect(result).toEqual([])
  })

  it('should call gerarLista', async () => {
    const dto = { cnpj: '12345678000199', mesesHistorico: 3 }
    service.gerarLista.mockResolvedValue({ id: 'list-1', itens: [] })
    const result = await controller.gerarLista('user-1', dto)
    expect(service.gerarLista).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual({ id: 'list-1', itens: [] })
  })

  it('should call obterLista', async () => {
    service.obterLista.mockResolvedValue({ id: 'list-1' })
    const result = await controller.obterLista('user-1')
    expect(service.obterLista).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ id: 'list-1' })
  })

  it('should call marcarItem', async () => {
    const dto = { comprado: true }
    service.marcarItem.mockResolvedValue({ id: 'list-1' })
    const result = await controller.marcarItem('user-1', '0', dto)
    expect(service.marcarItem).toHaveBeenCalledWith('user-1', 0, dto)
    expect(result).toEqual({ id: 'list-1' })
  })

  it('should call salvarItensEmLote', async () => {
    const dto = { itens: [{ nome: 'Item 1', comprado: true }] }
    service.salvarItensEmLote.mockResolvedValue({ id: 'list-1' })
    const result = await controller.salvarItensEmLote('user-1', dto as any)
    expect(service.salvarItensEmLote).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual({ id: 'list-1' })
  })

  it('should call removerItem', async () => {
    service.removerItem.mockResolvedValue({ id: 'list-1' })
    const result = await controller.removerItem('user-1', '1')
    expect(service.removerItem).toHaveBeenCalledWith('user-1', 1)
    expect(result).toEqual({ id: 'list-1' })
  })

  it('should call adicionarItem', async () => {
    const dto = { nome: 'LEITE', quantidade: 2 }
    service.adicionarItem.mockResolvedValue({ id: 'list-1' })
    const result = await controller.adicionarItem('user-1', dto as any)
    expect(service.adicionarItem).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual({ id: 'list-1' })
  })

  it('should call excluirLista', async () => {
    service.excluirLista.mockResolvedValue({ ok: true })
    const result = await controller.excluirLista('user-1')
    expect(service.excluirLista).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ ok: true })
  })

  it('should call salvarApelido', async () => {
    const dto = { nomeOriginal: 'LEITE ITAMBE', apelido: 'Leite' }
    service.salvarApelido.mockResolvedValue({ id: 'a1', ...dto })
    const result = await controller.salvarApelido('user-1', dto)
    expect(service.salvarApelido).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual({ id: 'a1', ...dto })
  })

  it('should call listarApelidos', async () => {
    service.listarApelidos.mockResolvedValue([])
    const result = await controller.listarApelidos('user-1')
    expect(service.listarApelidos).toHaveBeenCalledWith('user-1')
    expect(result).toEqual([])
  })

  it('should call removerApelido', async () => {
    service.removerApelido.mockResolvedValue({ ok: true })
    const result = await controller.removerApelido('user-1', 'a1')
    expect(service.removerApelido).toHaveBeenCalledWith('user-1', 'a1')
    expect(result).toEqual({ ok: true })
  })
})
