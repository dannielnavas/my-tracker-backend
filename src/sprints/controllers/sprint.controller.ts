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
import { SprintsDto, UpdateSprintDto } from '../dtos/sprint.dto';
import { SprintService } from '../services/sprint.service';

/**
 * DEPRECATED alias of SprintsController — frontend still uses /sprint for CRUD.
 * Canonical path is /sprints. Both support DELETE.
 */
@ApiTags('Sprints (deprecated /sprint)')
@Controller('sprint')
@UseGuards(JwtAuthGuard)
export class SprintController {
  constructor(private sprintService: SprintService) {}

  @ApiOperation({ summary: 'DEPRECATED — use POST /sprints', deprecated: true })
  @Post()
  create(@Body() payload: SprintsDto, @Req() req: Request) {
    return this.sprintService.create(payload, getRequestUserId(req));
  }

  @ApiOperation({ summary: 'DEPRECATED — use GET /sprints', deprecated: true })
  @Get()
  findAll(@Query() pagination: PaginationDto, @Req() req: Request) {
    return this.sprintService
      .findAll(getRequestUserId(req))
      .then((items) => paginate(items, pagination));
  }

  @ApiOperation({
    summary: 'DEPRECATED — use GET /sprints/:id',
    deprecated: true,
  })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sprintService.findOne(id);
  }

  @ApiOperation({
    summary: 'DEPRECATED — use PATCH /sprints/:id',
    deprecated: true,
  })
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

  @ApiOperation({
    summary: 'DEPRECATED — use DELETE /sprints/:id (plural canonical)',
    deprecated: true,
  })
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.sprintService.delete(
      id,
      getRequestUserId(req),
      getRequestRole(req),
    );
  }

  @ApiOperation({
    summary: 'DEPRECATED — use GET /sprints/user/:userId',
    deprecated: true,
  })
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

  @ApiOperation({
    summary: 'DEPRECATED — use GET /sprints/task/:taskId',
    deprecated: true,
  })
  @Get('task/:taskId')
  findByTaskId(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Req() req: Request,
  ) {
    return this.sprintService.findByTaskId(taskId, getRequestUserId(req));
  }

  @ApiOperation({
    summary: 'DEPRECATED — use GET /sprints/status/:status',
    deprecated: true,
  })
  @Get('status/:status')
  findByStatus(@Param('status') status: string, @Req() req: Request) {
    return this.sprintService.findByStatus(status, getRequestUserId(req));
  }
}
