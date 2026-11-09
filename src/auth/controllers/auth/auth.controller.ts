import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUserId } from '../../../common/decorators/current-user.decorator';
import { Users } from '../../../users/entities/user.entity';
import { ChangePasswordDto, RefreshTokenDto } from '../../dtos/auth.dto';
import { Public } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../../guard/jwt-auth/jwt-auth.guard';
import { AuthService } from '../../services/auth/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Req() req: Request) {
    const user = req.user as Users;
    if (!user.user_id) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.generateJWT(user);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  changePassword(
    @CurrentUserId() userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}
