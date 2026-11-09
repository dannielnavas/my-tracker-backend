import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import config from '../../config';
import { Token } from '../models/token.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret!,
    });
  }

  validate(payload: Token) {
    // exp is mandatory — reject tokens without expiry.
    if (!payload || typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Invalid token payload');
    }
    if (typeof payload.exp !== 'number' || payload.exp <= 0) {
      throw new UnauthorizedException('Token missing expiry');
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSec) {
      throw new UnauthorizedException('Token expired');
    }
    return payload;
  }
}
