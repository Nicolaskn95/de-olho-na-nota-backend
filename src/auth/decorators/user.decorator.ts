import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ user?: { userId: string } }>()
    return req.user?.userId ?? ''
  },
)

export const Username = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ user?: { username: string } }>()
    return req.user?.username ?? ''
  },
)
