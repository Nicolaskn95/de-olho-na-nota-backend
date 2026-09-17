import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtStrategy } from './jwt.strategy'

describe('JwtStrategy', () => {
  let strategy: JwtStrategy
  let mockUserModel: any
  let mockConfigService: any

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    }

    mockUserModel = {
      findById: jest.fn(),
    }

    strategy = new JwtStrategy(
      mockConfigService as unknown as ConfigService,
      mockUserModel,
    )
  })

  it('should be defined', () => {
    expect(strategy).toBeDefined()
  })

  describe('validate', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      })

      await expect(
        strategy.validate({ sub: 'user-123', username: 'user' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should return userId and username if user exists', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: { toString: () => 'user-123' },
          username: 'user',
        }),
      })

      const result = await strategy.validate({ sub: 'user-123', username: 'user' })
      expect(result).toEqual({ userId: 'user-123', username: 'user' })
    })
  })
})
