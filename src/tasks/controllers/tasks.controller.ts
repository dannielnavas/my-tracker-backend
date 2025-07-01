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
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth/jwt-auth.guard';
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
  getAllTasksForUser(@Query('user_id') userId: number) {
    return this.tasksService.getAllTasksForUser(userId);
  }

  @Patch(':id')
  updateTask(@Param('id') id: number, @Body() payload: UpdateTaskDto) {
    return this.tasksService.updateTask(id, payload);
  }
}
