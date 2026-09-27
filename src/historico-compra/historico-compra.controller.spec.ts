import { Test, TestingModule } from '@nestjs/testing'
import { HistoricoCompraController } from './historico-compra.controller'
import { HistoricoCompraService } from './historico-compra.service'

describe('HistoricoCompraController', () => {
  let controller: HistoricoCompraController
  let serviceMock: any

  beforeEach(async () => {
    serviceMock = {
      listarProdutosAgrupados: jest.fn(),
      buscarEvolucaoPrecoProduto: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoricoCompraController],
      providers: [
        {
          provide: HistoricoCompraService,
          useValue: serviceMock,
        },
      ],
    }).compile()

    controller = module.get<HistoricoCompraController>(HistoricoCompraController)
  })

  it('deve estar definido', () => {
    expect(controller).toBeDefined()
  })

  it('deve chamar listarProdutosAgrupados com os parâmetros corretos', async () => {
    const mockRetorno = [{ id: '1', nome: 'Leite' }]
    serviceMock.listarProdutosAgrupados.mockResolvedValue(mockRetorno)

    const res = await controller.listarProdutosAgrupados(
      'user123',
      '2026-01-01',
      '2026-01-31',
    )

    expect(serviceMock.listarProdutosAgrupados).toHaveBeenCalledWith(
      'user123',
      '2026-01-01',
      '2026-01-31',
    )
    expect(res).toEqual(mockRetorno)
  })

  it('deve chamar buscarEvolucaoPrecoProduto com id', async () => {
    serviceMock.buscarEvolucaoPrecoProduto.mockResolvedValue({ precoMinimo: 5 })
    const res = await controller.buscarEvolucaoPrecoProduto('prod123')
    expect(serviceMock.buscarEvolucaoPrecoProduto).toHaveBeenCalledWith('prod123')
    expect(res).toEqual({ precoMinimo: 5 })
  })
})
