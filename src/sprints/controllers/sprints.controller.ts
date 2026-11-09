import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth/jwt-auth.guard';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import {
  getRequestRole,
  getRequestUserId,
} from '../../common/decorators/current-user.decorator';
import { paginate } from '../../common/utils/pagination';
import { SprintService } from '../services/sprint.service';
import { SprintsDto, UpdateSprintDto } from '../dtos/sprint.dto';

/**
 * Canonical sprint controller (/sprints).
 * `/sprint` (singular) is kept as a deprecated alias for frontend compat.
 */
@ApiTags('Sprints')
@Controller('sprints')
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(private readonly sprintService: SprintService) {}

  @ApiOperation({ summary: 'Create sprint for the token user (canonical)' })
  @Post()
  create(@Body() payload: SprintsDto, @Req() req: Request) {
    const userId = getRequestUserId(req);
    return this.sprintService.create(payload, userId);
  }

  @ApiOperation({ summary: 'List sprints of the token user (canonical)' })
  @Get()
  findAll(@Query() pagination: PaginationDto, @Req() req: Request) {
    const userId = getRequestUserId(req);
    return this.sprintService
      .findAll(userId)
      .then((items) => paginate(items, pagination));
  }

  @ApiOperation({ summary: 'Get sprint by id (canonical)' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sprintService.findOne(id);
  }

  @ApiOperation({ summary: 'Update sprint (canonical)' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateSprintDto,
    @Req() req: Request,
  ) {
    return this.sprintService.update(
      id,
      payload,
      getRequestUserId(req),
      getRequestRole(req),
    );
  }

  @ApiOperation({ summary: 'Delete sprint (canonical)' })
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.sprintService.delete(
      id,
      getRequestUserId(req),
      getRequestRole(req),
    );
  }

  @ApiOperation({ summary: 'List sprints by user (canonical)' })
  @Get('user/:userId')
  findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pagination: PaginationDto,
    @Req() req: Request,
  ) {
    return this.sprintService
      .findByUserId(userId, getRequestUserId(req), getRequestRole(req))
      .then((items) => paginate(items, pagination));
  }

  @ApiOperation({ summary: 'List sprints by task (canonical)' })
  @Get('task/:taskId')
  findByTaskId(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Req() req: Request,
  ) {
    return this.sprintService.findByTaskId(taskId, getRequestUserId(req));
  }

  @ApiOperation({ summary: 'List sprints by status (canonical)' })
  @Get('status/:status')
  findByStatus(@Param('status') status: string, @Req() req: Request) {
    return this.sprintService.findByStatus(status, getRequestUserId(req));
  }
}
