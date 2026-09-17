import { Test, TestingModule } from '@nestjs/testing'
import { DuracaoMediaController } from './duracao-media.controller'
import { DuracaoMediaService } from './duracao-media.service'

describe('DuracaoMediaController', () => {
  let controller: DuracaoMediaController
  let service: Record<string, jest.Mock>

  beforeEach(async () => {
    service = {
      filtrar: jest.fn(),
      calcular: jest.fn(),
      calcularIa: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DuracaoMediaController],
      providers: [
        {
          provide: DuracaoMediaService,
          useValue: service,
        },
      ],
    }).compile()

    controller = module.get<DuracaoMediaController>(DuracaoMediaController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should call filtrar', async () => {
    const dto = { categoriaId: 'cat-1', mesInicial: '2026-01', qtdMeses: 3 }
    service.filtrar.mockResolvedValue({ produtos: [] })
    const result = await controller.filtrar('user-1', dto)
    expect(service.filtrar).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual({ produtos: [] })
  })

  it('should call calcular', async () => {
    const dto = { categoriaId: 'cat-1', mesInicial: '2026-01', qtdMeses: 3, produtosSelecionados: ['ARROZ'] }
    service.calcular.mockResolvedValue({ duracaoMediaDias: 15 })
    const result = await controller.calcular('user-1', dto)
    expect(service.calcular).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual({ duracaoMediaDias: 15 })
  })

  it('should call calcularIa', async () => {
    const dto = { categoriaId: 'cat-1', mesInicial: '2026-01', qtdMeses: 3, produtosSelecionados: ['ARROZ'] }
    service.calcularIa.mockResolvedValue({ duracaoMediaDias: 15, usouIa: true })
    const result = await controller.calcularIa('user-1', dto)
    expect(service.calcularIa).toHaveBeenCalledWith('user-1', dto)
    expect(result).toEqual({ duracaoMediaDias: 15, usouIa: true })
  })
})
