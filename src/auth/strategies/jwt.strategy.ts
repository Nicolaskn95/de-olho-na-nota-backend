import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { User, UserDocument } from '../schemas/user.schema'

export type JwtPayload = { sub: string; username: string }

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'dev-secret-change-me',
      ),
    })
  }

  async validate(
    payload: JwtPayload,
  ): Promise<{ userId: string; username: string }> {
    const user = await this.userModel.findById(payload.sub).lean()
    if (!user) {
      throw new UnauthorizedException()
    }
    return { userId: user._id.toString(), username: user.username }
  }
}
