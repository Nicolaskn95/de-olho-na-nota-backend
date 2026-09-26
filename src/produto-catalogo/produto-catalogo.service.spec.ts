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
      expect(service.isEanValido('12345')).toBe(false) // 5 dígitos
      expect(service.isEanValido('1234567890')).toBe(false) // 10 dígitos
      expect(service.isEanValido('123456789012345')).toBe(false) // 15 dígitos
    })

    it('deve retornar false para itens de pesagem interna de padaria/açougue (iniciados com 2 no EAN-13)', () => {
      // Padrão GS1 de circulação restrita / pesagem em balança de loja
      expect(service.isEanValido('2001234005001')).toBe(false)
      expect(service.isEanValido('2123456789012')).toBe(false)
    })

    it('deve retornar true para códigos GTIN universais válidos (8, 12, 13 e 14 dígitos)', () => {
      expect(service.isEanValido('12345670')).toBe(true) // GTIN-8
      expect(service.isEanValido('012345678905')).toBe(true) // GTIN-12 / UPC
      expect(service.isEanValido('7891000315507')).toBe(true) // GTIN-13 / EAN-13 (Açúcar União)
      expect(service.isEanValido('17891000315504')).toBe(true) // GTIN-14 / ITF-14
    })
  })

  describe('processarItemCatalogo', () => {
    it('deve retornar null e não chamar o banco se o cEAN for inválido', async () => {
      const resultadoSemGtin = await service.processarItemCatalogo(
        'SEM GTIN',
        'PAO FRANCES KG',
      )
      const resultadoPesagem = await service.processarItemCatalogo(
        '2012345678901',
        'MACA GALA KG',
      )
      const resultadoNulo = await service.processarItemCatalogo(
        null,
        'PRODUTO QUALQUER',
      )

      expect(resultadoSemGtin).toBeNull()
      expect(resultadoPesagem).toBeNull()
      expect(resultadoNulo).toBeNull()
      expect(mockProdutoCatalogoModel.findOneAndUpdate).not.toHaveBeenCalled()
    })

    it('deve retornar null e não chamar o banco se a descrição da nota for vazia', async () => {
      const resultado = await service.processarItemCatalogo(
        '7891000315507',
        '   ',
      )

      expect(resultado).toBeNull()
      expect(mockProdutoCatalogoModel.findOneAndUpdate).not.toHaveBeenCalled()
    })

    it('deve executar findOneAndUpdate com $setOnInsert para novo produto no catálogo', async () => {
      const ean = '7891000315507'
      const descricaoNota = 'ACUCAR REF INIAO 1KG'

      const mockCriado = {
        _id: 'prod-cat-123',
        ean,
        nomePadronizado: descricaoNota,
      }

      mockProdutoCatalogoModel.findOneAndUpdate.mockResolvedValue(mockCriado)

      const resultado = await service.processarItemCatalogo(ean, descricaoNota)

      expect(mockProdutoCatalogoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { ean },
        {
          $setOnInsert: {
            ean,
            nomePadronizado: descricaoNota,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )

      expect(resultado).toEqual(mockCriado)
    })

    it('deve retornar o produto existente preservando o nomePadronizado sem sobrescrita', async () => {
      const ean = '7891000315507'
      const descricaoNotaRuim = 'ACUCAR REF INIAO' // Erro de digitação da nota

      // Simula que o banco já possuía o nome limpo e o $setOnInsert não o alterou
      const mockExistente = {
        _id: 'prod-cat-123',
        ean,
        nomePadronizado: 'Açúcar Refinado União 1kg', // Nome limpo já existente
      }

      mockProdutoCatalogoModel.findOneAndUpdate.mockResolvedValue(mockExistente)

      const resultado = await service.processarItemCatalogo(
        ean,
        descricaoNotaRuim,
      )

      expect(mockProdutoCatalogoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { ean },
        {
          $setOnInsert: {
            ean,
            nomePadronizado: descricaoNotaRuim,
          },
        },
        expect.any(Object),
      )

      expect(resultado?.nomePadronizado).toBe('Açúcar Refinado União 1kg')
    })
  })

  describe('buscarPorEan', () => {
    it('deve retornar null se o ean for inválido', async () => {
      const resultado = await service.buscarPorEan('invalido')
      expect(resultado).toBeNull()
      expect(mockProdutoCatalogoModel.findOne).not.toHaveBeenCalled()
    })

    it('deve buscar e popular categoria quando o ean for válido', async () => {
      const ean = '7891000315507'
      const mockProduto = { _id: '123', ean, nomePadronizado: 'Açúcar' }

      const mockExec = jest.fn().mockResolvedValue(mockProduto)
      const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec })
      mockProdutoCatalogoModel.findOne.mockReturnValue({
        populate: mockPopulate,
      })

      const resultado = await service.buscarPorEan(ean)

      expect(mockProdutoCatalogoModel.findOne).toHaveBeenCalledWith({ ean })
      expect(mockPopulate).toHaveBeenCalledWith('categoria')
      expect(resultado).toEqual(mockProduto)
    })
  })
})
