import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException } from '@nestjs/common'
import { Types } from 'mongoose'
import { NotaFiscalService } from './nota-fiscal.service'
import { NotaFiscal } from './schemas/nota-fiscal.schema'
import { Produto } from './schemas/produto.schema'
import { EstabelecimentoUsuario } from './schemas/estabelecimento-usuario.schema'
import { CaptchaSolverService } from './captcha-solver.service'

describe('NotaFiscalService', () => {
  let service: NotaFiscalService
  let mockNotaFiscalModel: any
  let mockProdutoModel: any
  let mockEstabelecimentoUsuarioModel: any
  let mockCaptchaSolverService: any

  const validUserId = new Types.ObjectId().toString()
  const validNotaId = new Types.ObjectId().toString()

  beforeEach(async () => {
    mockNotaFiscalModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      aggregate: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    }

    mockProdutoModel = {
      find: jest.fn(),
      distinct: jest.fn(),
      insertMany: jest.fn(),
    }

    mockEstabelecimentoUsuarioModel = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
    }

    mockCaptchaSolverService = {
      resolverCaptcha: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotaFiscalService,
        {
          provide: getModelToken(NotaFiscal.name),
          useValue: mockNotaFiscalModel,
        },
        {
          provide: getModelToken(Produto.name),
          useValue: mockProdutoModel,
        },
        {
          provide: getModelToken(EstabelecimentoUsuario.name),
          useValue: mockEstabelecimentoUsuarioModel,
        },
        {
          provide: CaptchaSolverService,
          useValue: mockCaptchaSolverService,
        },
      ],
    }).compile()

    service = module.get<NotaFiscalService>(NotaFiscalService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('processarUrl', () => {
    it('should throw BadRequestException if URL is invalid', async () => {
      await expect(
        service.processarUrl('https://site-invalido.com/teste', validUserId),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('listarNotasPorUsuario', () => {
    it('should query notes by user and populate products', async () => {
      const mockNotas = [{ _id: validNotaId, estabelecimento: 'Mercado A' }]
      mockNotaFiscalModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockNotas),
        }),
      })

      const result = await service.listarNotasPorUsuario(validUserId)
      expect(result).toEqual(mockNotas)
    })
  })

  describe('buscarPorId', () => {
    it('should return note when found by id and user', async () => {
      const mockNota = { _id: validNotaId, estabelecimento: 'Mercado A' }
      mockNotaFiscalModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockNota),
        }),
      })

      const result = await service.buscarPorId(validNotaId, validUserId)
      expect(result).toEqual(mockNota)
    })
  })

  describe('listarNomesProdutos', () => {
    it('should return unique product names sorted alphabetically', async () => {
      mockNotaFiscalModel.find.mockReturnValue({
        distinct: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([new Types.ObjectId()]),
        }),
      })

      mockProdutoModel.distinct.mockReturnValue({
        exec: jest.fn().mockResolvedValue(['FEIJAO', 'ARROZ', 'CAFÉ']),
      })

      const result = await service.listarNomesProdutos('', validUserId)
      expect(result).toEqual(['ARROZ', 'CAFÉ', 'FEIJAO'])
    })
  })
})
