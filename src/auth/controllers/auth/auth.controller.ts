import {
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Users } from '../../../users/entities/user.entity';
import { AuthService } from '../../services/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // TODO: se usa el nombre dado en la strategy
  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Req() req: Request) {
    const user = req.user as Users;
    if (!user.user_id) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.generateJWT(user);
  }
}
