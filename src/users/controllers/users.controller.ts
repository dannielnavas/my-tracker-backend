import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth/jwt-auth.guard';
import { CreateUserDto } from '../dtos/user.dto';
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
