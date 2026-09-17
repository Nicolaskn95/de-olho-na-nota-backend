import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { GoogleLoginDto } from './dto/google-login.dto'
import { UpdateUsernameDto } from './dto/update-username.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { UserId, Username } from './decorators/user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@UserId() userId: string) {
    return this.authService.getUserProfile(userId)
  }

  @Post('link-google')
  @UseGuards(JwtAuthGuard)
  async linkGoogle(@UserId() userId: string, @Body() dto: GoogleLoginDto) {
    return this.authService.linkGoogleAccount(userId, dto.idToken)
  }

  @Post('unlink-google')
  @UseGuards(JwtAuthGuard)
  async unlinkGoogle(@UserId() userId: string) {
    return this.authService.unlinkGoogleAccount(userId)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@UserId() userId: string, @Body() dto: UpdateUsernameDto) {
    return this.authService.updateUsername(userId, dto)
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @UserId() userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto)
  }
}
