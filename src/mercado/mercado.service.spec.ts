import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException } from '@nestjs/common'
import { Types } from 'mongoose'
import { MercadoService } from './mercado.service'
import { Mercado } from './schemas/mercado.schema'

describe('MercadoService', () => {
  let service: MercadoService
  let mockMercadoModel: any

  beforeEach(async () => {
    mockMercadoModel = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoService,
        {
          provide: getModelToken(Mercado.name),
          useValue: mockMercadoModel,
        },
      ],
    }).compile()

    service = module.get<MercadoService>(MercadoService)
  })

  it('deve estar definido', () => {
    expect(service).toBeDefined()
  })

  describe('processarUpsertMercado', () => {
    it('deve lançar BadRequestException se o CNPJ for vazio ou inválido', async () => {
      await expect(
        service.processarUpsertMercado({ cnpj: '' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('deve chamar findOneAndUpdate com opções de upsert, new e setDefaultsOnInsert', async () => {
      const mockResult = {
        _id: new Types.ObjectId(),
        cnpj: '12345678000195',
        razaoSocial: 'MERCADO EXEMPLO LTDA',
        nomeFantasia: 'Mercado Exemplo',
      }
      mockMercadoModel.findOneAndUpdate.mockResolvedValue(mockResult)

      const dadosEntrada = {
        cnpj: '12.345.678/0001-95',
        razaoSocial: 'MERCADO EXEMPLO LTDA',
        nomeFantasia: 'Mercado Exemplo',
        endereco: {
          rua: 'Rua das Flores',
          numero: '123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          uf: 'SP',
        },
        cep: '01001-000',
      }

      const resultado = await service.processarUpsertMercado(dadosEntrada)

      expect(mockMercadoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { cnpj: '12345678000195' },
        {
          $set: {
            cnpj: '12345678000195',
            razaoSocial: 'MERCADO EXEMPLO LTDA',
            nomeFantasia: 'Mercado Exemplo',
            endereco: dadosEntrada.endereco,
            cep: '01001000',
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      expect(resultado).toBe(mockResult)
    })
  })
})
