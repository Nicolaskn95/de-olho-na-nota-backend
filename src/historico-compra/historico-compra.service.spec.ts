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
