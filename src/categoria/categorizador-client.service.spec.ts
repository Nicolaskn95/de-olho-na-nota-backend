import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { CategorizadorClientService } from './categorizador-client.service'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('CategorizadorClientService', () => {
  let service: CategorizadorClientService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategorizadorClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://143.244.145.133:8000'),
          },
        },
      ],
    }).compile()

    service = module.get<CategorizadorClientService>(CategorizadorClientService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('extrairPrefixo', () => {
    it('deve extrair prefixos coerentes que combinam com o início do nome do produto', () => {
      const produtos = [
        'SAB L MONANGE DETOX',
        'COCA COLA 2L ZERO',
        'PICANHA BOV RESFR',
        'DETERGENTE YPE MACA 500ML',
        'ARROZ CAMIL T1 5KG',
        'LEITE INTEGRAL PIRACANJUBA 1L',
      ]

      for (const prod of produtos) {
        const prefixo = service.extrairPrefixo(prod)
        expect(prefixo.length).toBeGreaterThanOrEqual(2)
        expect(prod.toUpperCase().startsWith(prefixo)).toBe(true)
      }
    })

    it('deve cortar unidades de medida (2L, 500ML, 5KG) do prefixo', () => {
      expect(service.extrairPrefixo('COCA COLA 2L ZERO')).toBe('COCA COLA')
      expect(service.extrairPrefixo('ARROZ CAMIL T1 5KG')).toBe('ARROZ CAMIL')
    })
  })

  describe('isOnline', () => {
    it('deve retornar true quando a resposta for 200 e status ready', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'ready' },
      })

      const online = await service.isOnline()
      expect(online).toBe(true)
    })

    it('deve retornar false quando o serviço falhar', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'))

      const online = await service.isOnline()
      expect(online).toBe(false)
    })
  })

  describe('categorizar', () => {
    it('deve chamar o endpoint /categorizar e retornar o payload', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          produto: 'COCA COLA 2L ZERO',
          categoria: 'BEBIDAS',
          confianca: 0.95,
        },
      })

      const resultado = await service.categorizar('COCA COLA 2L ZERO')
      expect(resultado).toEqual({
        produto: 'COCA COLA 2L ZERO',
        categoria: 'BEBIDAS',
        confianca: 0.95,
      })
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://143.244.145.133:8000/categorizar',
        { nome: 'COCA COLA 2L ZERO' },
        { timeout: 8000 },
      )
    })

    it('deve retornar null em caso de erro', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Timeout'))

      const resultado = await service.categorizar('PRODUTO INEXISTENTE')
      expect(resultado).toBeNull()
    })
  })

  describe('classificarProdutos', () => {
    it('deve classificar uma lista de produtos mapeando para categorias válidas', async () => {
      mockedAxios.post.mockImplementation((url, body: any) => {
        if (body.nome === 'COCA COLA 2L ZERO') {
          return Promise.resolve({
            data: {
              produto: body.nome,
              categoria: 'BEBIDAS',
              confianca: 0.95,
            },
          })
        }
        return Promise.resolve({
          data: {
            produto: body.nome,
            categoria: 'HIGIENE_E_BELEZA',
            confianca: 0.95,
          },
        })
      })

      const categorias = [
        { codigo: 'BEBIDAS', nome: 'Bebidas' },
        { codigo: 'HIGIENE_E_BELEZA', nome: 'Higiene e Beleza' },
      ]

      const resultado = await service.classificarProdutos(
        ['COCA COLA 2L ZERO', 'SAB L MONANGE DETOX'],
        categorias,
      )

      expect(resultado).toHaveLength(2)
      expect(resultado[0].codigoCategoria).toBe('BEBIDAS')
      expect(resultado[0].prefixo).toBe('COCA COLA')
      expect(resultado[1].codigoCategoria).toBe('HIGIENE_E_BELEZA')
    })
  })
})
