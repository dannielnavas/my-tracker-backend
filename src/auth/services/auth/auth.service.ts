import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Token } from 'src/auth/models/token.model';
import { Users } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/services/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersServices: UsersService,
    private jwtServices: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersServices.findOneByEmail(email);
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }

  generateJWT(user: Users) {
    // TODO: el sub es un idetificador unico del usuario
    const payload: Token = { role: user.role, sub: user.user_id };
    return {
      access_token: this.jwtServices.sign(payload),
      user,
    };
  }
}
