import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { QwenAiService, DadosItemConsumo } from './qwen-ai.service'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('QwenAiService', () => {
  let service: QwenAiService
  let configService: Record<string, jest.Mock>

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QwenAiService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile()

    service = module.get<QwenAiService>(QwenAiService)
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  const mockItem: DadosItemConsumo = {
    nome: 'ARROZ',
    unidade: 'KG',
    quantidadeTotal: 10,
    comprasCount: 2,
    datas: [new Date('2026-01-01'), new Date('2026-01-15')],
    diferencasDias: [14],
  }

  describe('analisarConsumo', () => {
    it('should use local fallback when QWEN_API_KEY is not configured', async () => {
      configService.get.mockReturnValue(null)

      const result = await service.analisarConsumo([mockItem], 3)
      expect(result.usouIa).toBe(false)
      expect(result.duracaoMediaDias).toBeGreaterThan(0)
      expect(result.detalhesProdutos).toHaveLength(1)
    })

    it('should call external API and parse JSON response when API key is present', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'QWEN_API_KEY') return 'test-key'
        if (key === 'QWEN_MODEL') return 'qwen-test-model'
        return null
      })

      const mockResponseJson = {
        duracaoMediaDias: 20,
        confianca: 'Alta',
        resumoIa: 'Consumo estável',
        insights: ['Compre em pacotes maiores'],
        previsaoProximaCompra: '2026-02-05',
        detalhesProdutos: [
          {
            nomeProduto: 'ARROZ',
            duracaoEstimadaDias: 20,
            consumoDiarioEstimado: '0.5 kg/dia',
            previsaoEsgotamento: '2026-02-05',
            confiancaProduto: 'Alta',
            explicacaoIa: 'Intervalo consistente',
          },
        ],
      }

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponseJson),
              },
            },
          ],
        },
      })

      const result = await service.analisarConsumo([mockItem], 3)
      expect(result.usouIa).toBe(true)
      expect(result.duracaoMediaDias).toBe(20)
      expect(result.confianca).toBe('Alta')
    })

    it('should fallback to local calculation when external API throws an error', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'QWEN_API_KEY') return 'test-key'
        return null
      })

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.analisarConsumo([mockItem], 3)
      expect(result.usouIa).toBe(false)
      expect(result.duracaoMediaDias).toBeGreaterThan(0)
    })
  })
})
