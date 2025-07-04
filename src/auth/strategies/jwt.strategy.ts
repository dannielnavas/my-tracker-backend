import { Inject, Injectable } from '@nestjs/common';
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
      // OBTENDREMOS EL TOKEN LOS HEADERS COMO 'Bearer token'
      ignoreExpiration: false,
      // IGNORA LA EXPIRACION, EN TU CASO EL TIEMPO QUE LE HAYAS PUESTO
      // EJE.  signOptions: { expiresIn: '24h' }, YO LE PUSE 1 DIA
      secretOrKey: configService.jwtSecret!,
      // LA LLAVE SECRETA CON LA QUE FIRMAMOS EL TOKEN AL HACER LOGIN
    });
  }

  // ESTA FUNCION LO QUE HARA SERA RECIBIR EL TOKEN DECODIFICADO
  // CON LA CARGA DE DATOS QUE LE PUSIMOS AL HACER LOGIN
  validate(payload: Token) {
    return payload;
  }
}
