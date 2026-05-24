import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtRefreshPayload } from '../types/auth.types';

export const REFRESH_COOKIE_NAME = 'cf_rt';

function extractRefreshFromCookie(req: Request): string | null {
  const token = req?.cookies?.[REFRESH_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: extractRefreshFromCookie,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: JwtRefreshPayload): JwtRefreshPayload {
    return payload;
  }
}
