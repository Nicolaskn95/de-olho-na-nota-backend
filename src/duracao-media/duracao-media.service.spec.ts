import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { NotFoundException } from '@nestjs/common'
import { Types } from 'mongoose'
import { DuracaoMediaService } from './duracao-media.service'
import { NotaFiscal } from '../nota-fiscal/schemas/nota-fiscal.schema'
import { Produto } from '../nota-fiscal/schemas/produto.schema'
import { Prefixo } from '../categoria/schemas/prefixo-categoria.schema'
import { Categoria } from '../categoria/schemas/categoria.schema'
import { QwenAiService } from './qwen-ai.service'

describe('DuracaoMediaService', () => {
  let service: DuracaoMediaService
  let mockNotaFiscalModel: any
  let mockProdutoModel: any
  let mockPrefixoModel: any
  let mockCategoriaModel: any
  let mockQwenAiService: any

  const validCatId = new Types.ObjectId().toString()
  const validUserId = new Types.ObjectId().toString()

  beforeEach(async () => {
    mockNotaFiscalModel = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
      findById: jest.fn(),
    }
    mockProdutoModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }
    mockPrefixoModel = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
    }
    mockCategoriaModel = {
      findById: jest.fn(),
    }
    mockQwenAiService = {
      analisarConsumo: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuracaoMediaService,
        {
          provide: getModelToken(NotaFiscal.name),
          useValue: mockNotaFiscalModel,
        },
        {
          provide: getModelToken(Produto.name),
          useValue: mockProdutoModel,
        },
        {
          provide: getModelToken(Prefixo.name),
          useValue: mockPrefixoModel,
        },
        {
          provide: getModelToken(Categoria.name),
          useValue: mockCategoriaModel,
        },
        {
          provide: QwenAiService,
          useValue: mockQwenAiService,
        },
      ],
    }).compile()

    service = module.get<DuracaoMediaService>(DuracaoMediaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('filtrar', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      mockCategoriaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      })

      await expect(
        service.filtrar(validUserId, {
          categoriaId: validCatId,
          mesInicial: '2026-01',
          qtdMeses: 3,
        }),
      ).rejects.toThrow(NotFoundException)
    })

    it('should return empty products when user has no prefixes and no notes', async () => {
      mockCategoriaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: validCatId, nome: 'Alimentação' }),
      })

      const result = await service.filtrar(validUserId, {
        categoriaId: validCatId,
        mesInicial: '2026-01',
        qtdMeses: 3,
      })

      expect(result.notasFiscais).toEqual([])
      expect(result.categoria.nome).toBe('Alimentação')
    })
  })

  describe('calcular', () => {
    it('should throw NotFoundException if no products found', async () => {
      mockProdutoModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      })

      await expect(
        service.calcular(validUserId, {
          produtoIds: [new Types.ObjectId().toString()],
        }),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
