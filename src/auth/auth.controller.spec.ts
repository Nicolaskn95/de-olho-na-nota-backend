import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

describe('AuthController', () => {
  let controller: AuthController
  let authService: Record<string, jest.Mock>

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      googleLogin: jest.fn(),
      getUserProfile: jest.fn(),
      linkGoogleAccount: jest.fn(),
      unlinkGoogleAccount: jest.fn(),
      updateUsername: jest.fn(),
      changePassword: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should call authService.register', async () => {
    const dto = { username: 'test', password: '123' }
    authService.register.mockResolvedValue({ id: '1', username: 'test' })

    const result = await controller.register(dto)
    expect(authService.register).toHaveBeenCalledWith(dto)
    expect(result).toEqual({ id: '1', username: 'test' })
  })

  it('should call authService.login', async () => {
    const dto = { username: 'test', password: '123' }
    const expected = { accessToken: 'token', expiresIn: '1d', user: { id: '1', username: 'test' } }
    authService.login.mockResolvedValue(expected)

    const result = await controller.login(dto)
    expect(authService.login).toHaveBeenCalledWith(dto)
    expect(result).toEqual(expected)
  })

  it('should call authService.googleLogin', async () => {
    const dto = { idToken: 'google-token' }
    authService.googleLogin.mockResolvedValue({ accessToken: 'token' })

    const result = await controller.googleLogin(dto)
    expect(authService.googleLogin).toHaveBeenCalledWith(dto)
    expect(result).toEqual({ accessToken: 'token' })
  })

  it('should call authService.getUserProfile', async () => {
    authService.getUserProfile.mockResolvedValue({ id: '1', username: 'test' })

    const result = await controller.me('1')
    expect(authService.getUserProfile).toHaveBeenCalledWith('1')
    expect(result).toEqual({ id: '1', username: 'test' })
  })

  it('should call authService.linkGoogleAccount', async () => {
    authService.linkGoogleAccount.mockResolvedValue({ ok: true })

    const result = await controller.linkGoogle('1', { idToken: 'google-token' })
    expect(authService.linkGoogleAccount).toHaveBeenCalledWith('1', 'google-token')
    expect(result).toEqual({ ok: true })
  })

  it('should call authService.unlinkGoogleAccount', async () => {
    authService.unlinkGoogleAccount.mockResolvedValue({ ok: true })

    const result = await controller.unlinkGoogle('1')
    expect(authService.unlinkGoogleAccount).toHaveBeenCalledWith('1')
    expect(result).toEqual({ ok: true })
  })

  it('should call authService.updateUsername', async () => {
    const dto = { username: 'newname' }
    authService.updateUsername.mockResolvedValue({ id: '1', username: 'newname' })

    const result = await controller.updateMe('1', dto)
    expect(authService.updateUsername).toHaveBeenCalledWith('1', dto)
    expect(result).toEqual({ id: '1', username: 'newname' })
  })

  it('should call authService.changePassword', async () => {
    const dto = { currentPassword: 'old', newPassword: 'new' }
    authService.changePassword.mockResolvedValue({ ok: true })

    const result = await controller.changePassword('1', dto)
    expect(authService.changePassword).toHaveBeenCalledWith('1', dto)
    expect(result).toEqual({ ok: true })
  })
})
