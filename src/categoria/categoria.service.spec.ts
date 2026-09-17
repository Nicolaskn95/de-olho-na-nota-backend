import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { CategoriaService } from './categoria.service'
import { Categoria } from './schemas/categoria.schema'
import { Prefixo } from './schemas/prefixo-categoria.schema'
import { NotaFiscal } from '../nota-fiscal/schemas/nota-fiscal.schema'
import { QwenAiService } from '../duracao-media/qwen-ai.service'

describe('CategoriaService', () => {
  let service: CategoriaService
  let mockCategoriaModel: any
  let mockPrefixoModel: any
  let mockNotaFiscalModel: any
  let mockQwenAiService: any

  beforeEach(async () => {
    mockCategoriaModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
    }

    // PrefixoModel works as both a model and a constructor
    const PrefixoConstructor: any = jest.fn().mockImplementation(function (data) {
      return {
        ...data,
        _id: 'p1',
        save: jest.fn().mockResolvedValue({ _id: 'p1' }),
      }
    })
    PrefixoConstructor.find = jest.fn()
    PrefixoConstructor.findOne = jest.fn()
    PrefixoConstructor.findById = jest.fn()
    PrefixoConstructor.findOneAndDelete = jest.fn()
    PrefixoConstructor.findOneAndUpdate = jest.fn()
    PrefixoConstructor.deleteMany = jest.fn()

    mockPrefixoModel = PrefixoConstructor

    mockNotaFiscalModel = {
      distinct: jest.fn(),
    }

    mockQwenAiService = {
      analisarConsumo: jest.fn(),
      analisarConsumoIa: jest.fn(),
      classificarComIa: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriaService,
        {
          provide: getModelToken(Categoria.name),
          useValue: mockCategoriaModel,
        },
        {
          provide: getModelToken(Prefixo.name),
          useValue: mockPrefixoModel,
        },
        {
          provide: getModelToken(NotaFiscal.name),
          useValue: mockNotaFiscalModel,
        },
        {
          provide: QwenAiService,
          useValue: mockQwenAiService,
        },
      ],
    }).compile()

    service = module.get<CategoriaService>(CategoriaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('onModuleInit', () => {
    it('should remove global prefixes without userId', async () => {
      mockPrefixoModel.deleteMany.mockResolvedValue({ deletedCount: 2 })
      await service.onModuleInit()
      expect(mockPrefixoModel.deleteMany).toHaveBeenCalledWith({
        userId: { $exists: false },
      })
    })
  })

  describe('listarCategorias', () => {
    it('should return sorted categories', async () => {
      const mockCats = [{ nome: 'Bebidas' }, { nome: 'Carnes' }]
      mockCategoriaModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockCats),
        }),
      })

      const result = await service.listarCategorias()
      expect(result).toEqual(mockCats)
    })
  })

  describe('buscarCategoriaPorId', () => {
    it('should return category when found', async () => {
      const mockCat = { _id: '507f1f77bcf86cd799439011', nome: 'Bebidas' }
      mockCategoriaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCat),
      })

      const result = await service.buscarCategoriaPorId('507f1f77bcf86cd799439011')
      expect(result).toEqual(mockCat)
    })

    it('should return null when not found', async () => {
      mockCategoriaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      })

      const result = await service.buscarCategoriaPorId('507f1f77bcf86cd799439011')
      expect(result).toBeNull()
    })
  })

  describe('criarPrefixo', () => {
    const userId = '507f1f77bcf86cd799439011'
    const catId = '507f1f77bcf86cd799439012'

    it('should throw ConflictException if prefix already exists for user', async () => {
      mockPrefixoModel.findOne.mockResolvedValue({ prefixo: 'LEITE' })

      await expect(
        service.criarPrefixo(userId, { prefixo: 'LEITE', categoriaId: catId }),
      ).rejects.toThrow(ConflictException)
    })

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrefixoModel.findOne.mockResolvedValue(null)
      mockCategoriaModel.findById.mockResolvedValue(null)

      await expect(
        service.criarPrefixo(userId, { prefixo: 'LEITE', categoriaId: catId }),
      ).rejects.toThrow(NotFoundException)
    })

    it('should successfully create prefix if valid', async () => {
      mockPrefixoModel.findOne.mockResolvedValue(null)
      mockCategoriaModel.findById.mockResolvedValue({ _id: catId, nome: 'Laticínios' })
      mockPrefixoModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'p1',
            prefixo: 'LEITE',
            categoria: { _id: catId, nome: 'Laticínios' },
          }),
        }),
      })

      const result = await service.criarPrefixo(userId, {
        prefixo: 'LEITE',
        categoriaId: catId,
      })

      expect(result.prefixo).toBe('LEITE')
    })
  })

  describe('removerPrefixo', () => {
    const userId = '507f1f77bcf86cd799439011'
    const prefixoId = '507f1f77bcf86cd799439013'

    it('should throw NotFoundException if prefix not found or not owned by user', async () => {
      mockPrefixoModel.findOneAndDelete.mockResolvedValue(null)

      await expect(service.removerPrefixo(userId, prefixoId)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should resolve successfully when owned by user', async () => {
      mockPrefixoModel.findOneAndDelete.mockResolvedValue({ _id: prefixoId })

      await expect(service.removerPrefixo(userId, prefixoId)).resolves.toBeUndefined()
    })
  })
})
