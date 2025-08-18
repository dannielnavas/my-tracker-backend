import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth/jwt-auth.guard';
import { CreateTaskDto, UpdateTaskDto } from '../dtos/tasks.dto';
import { TasksService } from '../services/tasks.service';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  create(@Body() payload: CreateTaskDto) {
    return this.tasksService.create(payload);
  }

  @Get()
  getAllTasksForSprint(@Query('sprint_id') sprintId: number) {
    return this.tasksService.getAllTasksForSprint(sprintId);
  }

  @Patch(':id')
  updateTask(@Param('id') id: number, @Body() payload: UpdateTaskDto) {
    return this.tasksService.updateTask(id, payload);
  }

  @Get('count-task-pending/:sprint_id')
  getCountTaskPending(@Param('sprint_id') sprintId: number) {
    return this.tasksService.getCountTaskPending(sprintId);
  }

  @Get('count-task-completed/:sprint_id')
  getCountTaskCompleted(@Param('sprint_id') sprintId: number) {
    return this.tasksService.getCountTaskCompleted(sprintId);
  }

  @Get('count-task-in-progress/:sprint_id')
  getCountTaskInProgress(@Param('sprint_id') sprintId: number) {
    return this.tasksService.getCountTaskInProgress(sprintId);
  }
}
