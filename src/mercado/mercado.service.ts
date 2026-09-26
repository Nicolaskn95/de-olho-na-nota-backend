import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Mercado, MercadoDocument } from './schemas/mercado.schema'
import { UpsertMercadoDto } from './dto/upsert-mercado.dto'

@Injectable()
export class MercadoService {
  private readonly logger = new Logger(MercadoService.name)

  constructor(
    @InjectModel(Mercado.name)
    private readonly mercadoModel: Model<MercadoDocument>,
  ) {}

  /**
   * Remove caracteres não numéricos de CPF/CNPJ.
   */
  private sanitizarCnpj(cnpj: string): string {
    return cnpj ? cnpj.replace(/\D/g, '').trim() : ''
  }

  /**
   * Insere ou recupera um mercado de forma atômica no MongoDB usando findOneAndUpdate.
   * Evita race condition caso múltiplos usuários processem notas do mesmo mercado simultaneamente.
   */
  async processarUpsertMercado(
    dadosExtraidosDaNota: UpsertMercadoDto,
  ): Promise<MercadoDocument> {
    const cnpjLimpo = this.sanitizarCnpj(dadosExtraidosDaNota.cnpj)

    if (!cnpjLimpo) {
      throw new BadRequestException('CNPJ é obrigatório para processar o mercado.')
    }

    const updateFields: Record<string, any> = {
      cnpj: cnpjLimpo,
    }

    if (dadosExtraidosDaNota.razaoSocial) {
      updateFields.razaoSocial = dadosExtraidosDaNota.razaoSocial.trim()
    }

    if (dadosExtraidosDaNota.nomeFantasia) {
      updateFields.nomeFantasia = dadosExtraidosDaNota.nomeFantasia.trim()
    }

    if (dadosExtraidosDaNota.endereco) {
      updateFields.endereco = dadosExtraidosDaNota.endereco
    }

    if (dadosExtraidosDaNota.cep) {
      updateFields.cep = dadosExtraidosDaNota.cep.replace(/\D/g, '').trim()
    }

    const mercado = await this.mercadoModel.findOneAndUpdate(
      { cnpj: cnpjLimpo },
      { $set: updateFields },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    )

    this.logger.log(
      `Mercado processado com sucesso [CNPJ: ${cnpjLimpo}, ID: ${mercado._id}]`,
    )

    return mercado
  }

  /**
   * Busca mercado por CNPJ (normalizado).
   */
  async buscarPorCnpj(cnpj: string): Promise<MercadoDocument | null> {
    const cnpjLimpo = this.sanitizarCnpj(cnpj)
    if (!cnpjLimpo) return null
    return this.mercadoModel.findOne({ cnpj: cnpjLimpo }).exec()
  }

  /**
   * Busca mercado por ID.
   */
  async buscarPorId(id: string): Promise<MercadoDocument | null> {
    return this.mercadoModel.findById(id).exec()
  }
}
