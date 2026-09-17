import { Test, TestingModule } from '@nestjs/testing'
import axios from 'axios'
import { CaptchaSolverService } from './captcha-solver.service'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('CaptchaSolverService', () => {
  let service: CaptchaSolverService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaptchaSolverService],
    }).compile()

    service = module.get<CaptchaSolverService>(CaptchaSolverService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should download captcha image and call OCR process', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: Buffer.from('fake-image-bytes'),
    })

    // Mock internal methods to avoid spinning up real native Sharp / Tesseract binary workers in unit test
    jest.spyOn(service as any, 'preprocessImage').mockResolvedValue(Buffer.from('processed-bytes'))
    jest.spyOn(service as any, 'executarOcr').mockResolvedValue('A1B2C3')

    const result = await service.resolverCaptcha('http://fake-captcha-url', 'session-cookie')
    expect(mockedAxios.get).toHaveBeenCalledWith('http://fake-captcha-url', expect.any(Object))
    expect(result).toBe('A1B2C3')
  })
})
