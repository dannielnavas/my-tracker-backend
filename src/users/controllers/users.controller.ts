import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth/jwt-auth.guard';
import {
  getRequestRole,
  getRequestUserId,
} from 'src/common/decorators/current-user.decorator';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
} from '../dtos/user.dto';
import { UsersService } from '../services/users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Public()
  create(@Body() payload: CreateUserDto) {
    return this.usersService.create(payload);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const requesterId = getRequestUserId(req);
    const role = getRequestRole(req);
    if (role !== 'admin' && requesterId !== id) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cannot access another user profile',
      });
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateUserDto,
    @Req() req: Request,
  ) {
    const requesterId = getRequestUserId(req);
    const role = getRequestRole(req);
    if (role !== 'admin' && requesterId !== id) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cannot update another user profile',
      });
    }
    // Strip client-controlled fields — role / plan / password / stripe id never come from client.
    const {
      role: _r,
      password: _pw,
      subscription_plan_id: _p,
      stripe_customer_id: _s,
      ...safe
    } = payload as any;
    void _r;
    void _pw;
    void _p;
    void _s;
    return this.usersService.update(id, safe);
  }

  // Deprecated alias: prefer POST /auth/change-password (token-derived user).
  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const requesterId = getRequestUserId(req);
    const role = getRequestRole(req);
    if (role !== 'admin' && requesterId !== id) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cannot change another user password',
      });
    }
    return this.usersService.changePassword(
      id,
      payload.current_password,
      payload.new_password,
    );
  }
}
