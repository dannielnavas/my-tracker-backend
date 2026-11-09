import {
  Body,
  Controller,
  Get,
  Header,
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
import { PaginationDto } from '../../common/dtos/pagination.dto';
import {
  getRequestRole,
  getRequestUserId,
} from '../../common/decorators/current-user.decorator';
import { paginate } from '../../common/utils/pagination';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth/jwt-auth.guard';
import {
  CreateTaskDto,
  ReorderTasksDto,
  UpdateTaskDto,
} from '../dtos/tasks.dto';
import { TasksService } from '../services/tasks.service';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @ApiOperation({
    summary: 'Create task (owner = sprint owner, free limit enforced)',
  })
  @Post()
  create(@Body() payload: CreateTaskDto, @Req() req: Request) {
    return this.tasksService.create(
      payload,
      getRequestUserId(req),
      getRequestRole(req),
    );
  }

  @ApiOperation({
    summary: 'List tasks for a sprint (?sprint_id=&page=&limit=)',
  })
  @Get()
  getAllTasksForSprint(
    @Query('sprint_id', ParseIntPipe) sprintId: number,
    @Query() pagination: PaginationDto,
    @Req() req: Request,
  ) {
    return this.tasksService
      .getAllTasksForSprint(
        sprintId,
        getRequestUserId(req),
        getRequestRole(req),
      )
      .then((items) => paginate(items, pagination));
  }

  // Must be declared BEFORE @Patch(':id') so /tasks/reorder isn't captured as id.
  @ApiOperation({
    summary:
      'Reorder tasks transactionally ({sprint_id?, tasks:[{task_id,position}]})',
  })
  @Patch('reorder')
  reorderTasks(@Body() payload: ReorderTasksDto, @Req() req: Request) {
    return this.tasksService.reorderTasks(
      payload,
      getRequestUserId(req),
      getRequestRole(req),
    );
  }

  @ApiOperation({
    summary: 'Update task (status 1/2/3 only, date_end is server-controlled)',
  })
  @Patch(':id')
  updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateTaskDto,
    @Req() req: Request,
  ) {
    return this.tasksService.updateTask(
      id,
      payload,
      getRequestUserId(req),
      getRequestRole(req),
    );
  }

  @Header('Deprecation', 'true')
  @ApiOperation({
    summary: 'DEPRECATED — prefer SprintResponse.countTaskPending',
    deprecated: true,
  })
  @Get('count-task-pending/:sprint_id')
  getCountTaskPending(@Param('sprint_id', ParseIntPipe) sprintId: number) {
    return this.tasksService.getCountTaskPending(sprintId);
  }

  @Header('Deprecation', 'true')
  @ApiOperation({
    summary: 'DEPRECATED — prefer SprintResponse.countTaskCompleted',
    deprecated: true,
  })
  @Get('count-task-completed/:sprint_id')
  getCountTaskCompleted(@Param('sprint_id', ParseIntPipe) sprintId: number) {
    return this.tasksService.getCountTaskCompleted(sprintId);
  }

  @Header('Deprecation', 'true')
  @ApiOperation({
    summary: 'DEPRECATED — prefer SprintResponse.countTaskInProgress',
    deprecated: true,
  })
  @Get('count-task-in-progress/:sprint_id')
  getCountTaskInProgress(@Param('sprint_id', ParseIntPipe) sprintId: number) {
    return this.tasksService.getCountTaskInProgress(sprintId);
  }
}
