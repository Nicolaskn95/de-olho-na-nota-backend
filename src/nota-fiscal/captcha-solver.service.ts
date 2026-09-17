import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import sharp from 'sharp'

/**
 * Serviço responsável por baixar e resolver CAPTCHAs da NFCe SP
 * usando Tesseract.js para OCR.
 */
@Injectable()
export class CaptchaSolverService {
  private readonly logger = new Logger(CaptchaSolverService.name)

  /**
   * Baixa a imagem do CAPTCHA do servidor NFCe SP,
   * pré-processa com sharp e resolve com Tesseract OCR.
   *
   * @param captchaUrl URL completa da imagem do CAPTCHA
   * @param cookies Cookies da sessão para manter a mesma sessão
   * @returns Texto reconhecido do CAPTCHA
   */
  async resolverCaptcha(captchaUrl: string, cookies: string): Promise<string> {
    // 1. Baixar a imagem do CAPTCHA
    const imageResponse = await axios.get(captchaUrl, {
      responseType: 'arraybuffer',
      headers: {
        Cookie: cookies,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer:
          'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx',
      },
      timeout: 10000,
    })

    const imageBuffer = Buffer.from(imageResponse.data as ArrayBuffer)

    // 2. Pré-processar a imagem para melhorar o OCR
    const processedBuffer = await this.preprocessImage(imageBuffer)

    // 3. Executar OCR com Tesseract
    const text = await this.executarOcr(processedBuffer)

    return text
  }

  /**
   * Pré-processamento da imagem do CAPTCHA:
   * - Converte para grayscale
   * - Aumenta o tamanho (resize 3x)
   * - Aplica threshold para binarizar
   * - Aumenta nitidez (sharpen)
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const processed = await sharp(imageBuffer)
        .grayscale()
        .resize({ width: 450, kernel: 'lanczos3' })
        .normalize()
        .sharpen({ sigma: 2 })
        .threshold(140)
        .negate()
        .threshold(128)
        .negate()
        .png()
        .toBuffer()

      return processed
    } catch (error) {
      this.logger.warn(
        `Falha no pré-processamento, usando imagem original: ${error instanceof Error ? error.message : 'erro'}`,
      )
      return imageBuffer
    }
  }

  /**
   * Executa OCR na imagem usando Tesseract.js
   */
  private async executarOcr(imageBuffer: Buffer): Promise<string> {
    // Dynamic import para ESM compatibilidade com tesseract.js v7
    const Tesseract = await import('tesseract.js')
    const worker = await Tesseract.createWorker('eng')

    try {
      // Configurações otimizadas para CAPTCHA alfanumérico
      await worker.setParameters({
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        tessedit_pageseg_mode: '7' as unknown as Tesseract.PSM, // Single text line
      })

      const {
        data: { text },
      } = await worker.recognize(imageBuffer)

      // Limpa o texto: remove espaços e caracteres inválidos
      const cleaned = text.replace(/[^A-Za-z0-9]/g, '').trim()

      this.logger.debug(
        `CAPTCHA reconhecido: "${cleaned}" (raw: "${text.trim()}")`,
      )

      return cleaned
    } finally {
      await worker.terminate()
    }
  }
}
