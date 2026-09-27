import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException } from '@nestjs/common'
import { Types } from 'mongoose'
import { HistoricoCompraService } from './historico-compra.service'
import { HistoricoCompra } from './schemas/historico-compra.schema'

describe('HistoricoCompraService', () => {
  let service: HistoricoCompraService
  let modelMock: any

  beforeEach(async () => {
    modelMock = {
      aggregate: jest.fn(),
      insertMany: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoricoCompraService,
        {
          provide: getModelToken(HistoricoCompra.name),
          useValue: modelMock,
        },
      ],
    }).compile()

    service = module.get<HistoricoCompraService>(HistoricoCompraService)
  })

  it('deve estar definido', () => {
    expect(service).toBeDefined()
  })

  describe('buscarEvolucaoPrecoProduto', () => {
    it('deve lançar BadRequestException se ID for inválido', async () => {
      await expect(
        service.buscarEvolucaoPrecoProduto('id-invalido'),
      ).rejects.toThrow(BadRequestException)
    })

    it('deve executar o pipeline de agregação com os estágios corretos ($match, $group, $sort, $project)', async () => {
      const validId = new Types.ObjectId()
      const estatisticaEsperada = {
        produtoCatalogoId: validId.toHexString(),
        precoMinimo: 4.5,
        precoMaximo: 6.0,
        precoMedio: 5.25,
        totalRegistros: 2,
        periodoDias: 30,
        dataMaisRecente: new Date(),
      }

      modelMock.aggregate.mockResolvedValue([estatisticaEsperada])

      const resultado = await service.buscarEvolucaoPrecoProduto(
        validId.toHexString(),
      )

      expect(modelMock.aggregate).toHaveBeenCalledTimes(1)
      const pipeline = modelMock.aggregate.mock.calls[0][0]

      expect(pipeline).toHaveLength(4)
      expect(pipeline[0]).toHaveProperty('$match')
      expect(pipeline[0].$match.produtoCatalogoId).toEqual(validId)
      expect(pipeline[0].$match.dataCompra).toHaveProperty('$gte')

      expect(pipeline[1]).toHaveProperty('$group')
      expect(pipeline[1].$group).toEqual({
        _id: '$produtoCatalogoId',
        precoMinimo: { $min: '$precoUnitario' },
        precoMaximo: { $max: '$precoUnitario' },
        precoMedio: { $avg: '$precoUnitario' },
        totalRegistros: { $sum: 1 },
        dataMaisRecente: { $max: '$dataCompra' },
      })

      expect(pipeline[2]).toHaveProperty('$sort')
      expect(pipeline[2].$sort).toEqual({ dataMaisRecente: -1 })

      expect(pipeline[3]).toHaveProperty('$project')

      expect(resultado).toEqual(estatisticaEsperada)
    })

    it('deve retornar null quando o produto não tiver histórico nos últimos 30 dias', async () => {
      const validId = new Types.ObjectId()
      modelMock.aggregate.mockResolvedValue([])

      const resultado = await service.buscarEvolucaoPrecoProduto(validId)
      expect(resultado).toBeNull()
    })
  })

  describe('listarProdutosAgrupados', () => {
    it('deve lançar BadRequestException se usuarioId for inválido', async () => {
      await expect(
        service.listarProdutosAgrupados('id-invalido'),
      ).rejects.toThrow(BadRequestException)
    })

    it('deve retornar produtos agrupados calculando estatísticas e estabelecimentos', async () => {
      const validUserId = new Types.ObjectId().toString()
      const mockGrupos = [
        {
          _id: new Types.ObjectId(),
          produtoCatalogoId: new Types.ObjectId(),
          nomePadronizado: 'LEITE INTEGRAL PIRACANJUBA 1L',
          categoria: {
            _id: new Types.ObjectId(),
            nome: 'LATICINIOS_E_OVOS',
            cor: '#3B82F6',
          },
          nomes: [
            '1 UN - LEITE INTEGRAL PIRACANJUBA 1L',
            'MERC PIRACANJUBA LEITE INTEGRAL 1L',
          ],
          totalGasto: 10.5,
          totalQuantidade: 2,
          vezesComprado: 2,
          itens: [
            {
              precoUnitario: 5.5,
              precoTotal: 5.5,
              quantidade: 1,
              dataCompra: new Date('2026-09-20'),
              estabelecimento: 'Mercado A',
            },
            {
              precoUnitario: 5.0,
              precoTotal: 5.0,
              quantidade: 1,
              dataCompra: new Date('2026-09-10'),
              estabelecimento: 'Mercado B',
            },
          ],
        },
      ]

      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockGrupos),
      }
      modelMock.aggregate.mockReturnValue(mockQuery)

      const resultado = await service.listarProdutosAgrupados(validUserId)

      expect(resultado).toHaveLength(1)
      expect(resultado[0].nome).toBe('LEITE INTEGRAL PIRACANJUBA 1L')
      expect(resultado[0].totalGasto).toBe(10.5)
      expect(resultado[0].totalQuantidade).toBe(2)
      expect(resultado[0].vezesComprado).toBe(2)
      expect(resultado[0].mediaPrecoUnitario).toBe(5.25)
      expect(resultado[0].ultimoPreco).toBe(5.5)
      expect(resultado[0].nomes).toEqual([
        '1 UN - LEITE INTEGRAL PIRACANJUBA 1L',
        'MERC PIRACANJUBA LEITE INTEGRAL 1L',
      ])
      expect(resultado[0].estabelecimentos['Mercado A']).toEqual({
        total: 5.5,
        count: 1,
        ultimoPreco: 5.5,
      })
      expect(resultado[0].estabelecimentos['Mercado B']).toEqual({
        total: 5.0,
        count: 1,
        ultimoPreco: 5.0,
      })
      expect(resultado[0].precosPorMes['2026-09']).toEqual({
        total: 10.5,
        count: 2,
      })
    })
  })

  describe('registrarItensEmLote', () => {
    it('deve retornar array vazio se a lista de itens for vazia', async () => {
      const res = await service.registrarItensEmLote([])
      expect(res).toEqual([])
      expect(modelMock.insertMany).not.toHaveBeenCalled()
    })

    it('deve delegar a inserção para o insertMany do Mongoose', async () => {
      const itens = [
        {
          descricaoBrutaNota: 'Arroz 5kg',
          quantidade: 1,
          precoUnitario: 25.9,
        },
      ]
      modelMock.insertMany.mockResolvedValue(itens)

      const res = await service.registrarItensEmLote(itens as any)
      expect(modelMock.insertMany).toHaveBeenCalledWith(itens)
      expect(res).toEqual(itens)
    })
  })
})
