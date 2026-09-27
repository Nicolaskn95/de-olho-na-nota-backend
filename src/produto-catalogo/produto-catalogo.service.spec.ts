import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { ProdutoCatalogoService } from './produto-catalogo.service'
import { ProdutoCatalogo } from './schemas/produto-catalogo.schema'

interface MockProdutoCatalogoModel {
  findOneAndUpdate: jest.Mock
  findOne: jest.Mock
}

describe('ProdutoCatalogoService', () => {
  let service: ProdutoCatalogoService
  let mockProdutoCatalogoModel: MockProdutoCatalogoModel

  beforeEach(async () => {
    mockProdutoCatalogoModel = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProdutoCatalogoService,
        {
          provide: getModelToken(ProdutoCatalogo.name),
          useValue: mockProdutoCatalogoModel,
        },
      ],
    }).compile()

    service = module.get<ProdutoCatalogoService>(ProdutoCatalogoService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('deve estar definido', () => {
    expect(service).toBeDefined()
  })

  describe('isEanValido', () => {
    it('deve retornar false para valores nulos, vazios ou indefinidos', () => {
      expect(service.isEanValido(null)).toBe(false)
      expect(service.isEanValido(undefined)).toBe(false)
      expect(service.isEanValido('')).toBe(false)
      expect(service.isEanValido('   ')).toBe(false)
    })

    it('deve retornar false para valores marcados como "SEM GTIN" da SEFAZ', () => {
      expect(service.isEanValido('SEM GTIN')).toBe(false)
      expect(service.isEanValido('sem gtin')).toBe(false)
      expect(service.isEanValido('SEMGTIN')).toBe(false)
      expect(service.isEanValido('NAO INFORMADO')).toBe(false)
      expect(service.isEanValido('NULL')).toBe(false)
    })

    it('deve retornar false para códigos contendo caracteres não numéricos', () => {
      expect(service.isEanValido('789100031550A')).toBe(false)
      expect(service.isEanValido('ABC-1234')).toBe(false)
    })

    it('deve retornar false para tamanhos que não correspondem a padrões GTIN', () => {
      expect(service.isEanValido('12345')).toBe(false)
      expect(service.isEanValido('1234567890')).toBe(false)
    })

    it('deve retornar false para itens de pesagem interna de balança (iniciados com 2 no EAN-13)', () => {
      expect(service.isEanValido('2001234005001')).toBe(false)
      expect(service.isEanValido('2123456789012')).toBe(false)
    })

    it('deve retornar true para códigos GTIN universais válidos (8, 12, 13 e 14 dígitos)', () => {
      expect(service.isEanValido('12345670')).toBe(true)
      expect(service.isEanValido('012345678905')).toBe(true)
      expect(service.isEanValido('7891000315507')).toBe(true)
      expect(service.isEanValido('17891000315504')).toBe(true)
    })
  })

  describe('processarItemCatalogo', () => {
    it('deve processar item com EAN válido usando chave EAN_{ean}', async () => {
      const ean = '7891000315507'
      const nome = '1 UN - ACUCAR UNIAO REFINADO 1KG'
      const mockDoc = {
        _id: 'doc123',
        chaveCanonica: `EAN_${ean}`,
        ean,
        nomePadronizado: 'ACUCAR UNIAO REFINADO 1KG',
      }

      mockProdutoCatalogoModel.findOneAndUpdate.mockResolvedValue(mockDoc)

      const resultado = await service.processarItemCatalogo(ean, nome)

      expect(mockProdutoCatalogoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { chaveCanonica: `EAN_${ean}` },
        {
          $setOnInsert: {
            chaveCanonica: `EAN_${ean}`,
            ean,
            nomePadronizado: 'ACUCAR UNIAO REFINADO 1KG',
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      expect(resultado).toEqual(mockDoc)
    })

    it('deve processar item SEM GTIN ou hortifrúti gerando chave canônica unificada a partir dos tokens', async () => {
      const mockDoc = {
        _id: 'docBanana',
        chaveCanonica: 'CANON_BANANA_NANICA',
        ean: null,
        nomePadronizado: 'BANANA NANICA',
      }

      mockProdutoCatalogoModel.findOneAndUpdate.mockResolvedValue(mockDoc)

      const resultadoA = await service.processarItemCatalogo(
        'SEM GTIN',
        '0.686 KG - BANANA NANICA',
      )

      expect(mockProdutoCatalogoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { chaveCanonica: 'CANON_BANANA_NANICA' },
        {
          $setOnInsert: {
            chaveCanonica: 'CANON_BANANA_NANICA',
            ean: null,
            nomePadronizado: 'BANANA NANICA',
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      expect(resultadoA).toEqual(mockDoc)

      // Outro mercado com prefixo de setor HORT
      await service.processarItemCatalogo(null, 'HORT BANANA NANICA')
      expect(mockProdutoCatalogoModel.findOneAndUpdate).toHaveBeenLastCalledWith(
        { chaveCanonica: 'CANON_BANANA_NANICA' },
        expect.anything(),
        expect.anything(),
      )
    })

    it('deve retornar null se a descrição for vazia ou inválida', async () => {
      const resultadoVazio = await service.processarItemCatalogo('12345', '')
      const resultadoNulo = await service.processarItemCatalogo(null, null)

      expect(resultadoVazio).toBeNull()
      expect(resultadoNulo).toBeNull()
      expect(mockProdutoCatalogoModel.findOneAndUpdate).not.toHaveBeenCalled()
    })
  })

  describe('buscarPorChaveCanonica', () => {
    it('deve buscar pelo campo chaveCanonica com populate de categoria', async () => {
      const mockDoc = { _id: '123', chaveCanonica: 'CANON_ARROZ' }
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockDoc),
      }
      mockProdutoCatalogoModel.findOne.mockReturnValue(mockQuery)

      const res = await service.buscarPorChaveCanonica('CANON_ARROZ')

      expect(mockProdutoCatalogoModel.findOne).toHaveBeenCalledWith({
        chaveCanonica: 'CANON_ARROZ',
      })
      expect(res).toEqual(mockDoc)
    })
  })

  describe('buscarPorEan', () => {
    it('deve retornar null se EAN for inválido', async () => {
      const res = await service.buscarPorEan('SEM GTIN')
      expect(res).toBeNull()
    })

    it('deve buscar por EAN quando válido', async () => {
      const mockDoc = { _id: '123', ean: '7891000315507' }
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockDoc),
      }
      mockProdutoCatalogoModel.findOne.mockReturnValue(mockQuery)

      const res = await service.buscarPorEan('7891000315507')
      expect(mockProdutoCatalogoModel.findOne).toHaveBeenCalledWith({
        ean: '7891000315507',
      })
      expect(res).toEqual(mockDoc)
    })
  })
})
