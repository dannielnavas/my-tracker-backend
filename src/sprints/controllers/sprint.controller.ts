import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth/jwt-auth.guard';
import { SprintsDto, UpdateSprintDto } from '../dtos/sprint.dto';
import { SprintService } from '../services/sprint.service';

@Controller('sprint')
@ApiTags('Sprints')
@UseGuards(JwtAuthGuard)
export class SprintController {
  constructor(private sprintService: SprintService) {}

  @Post()
  create(@Body() payload: SprintsDto) {
    return this.sprintService.create(payload);
  }

  @Get()
  findAll() {
    return this.sprintService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.sprintService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() payload: UpdateSprintDto) {
    return this.sprintService.update(id, payload);
  }

  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.sprintService.delete(id);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: number) {
    return this.sprintService.findByUserId(userId);
  }

  @Get('task/:taskId')
  findByTaskId(@Param('taskId') taskId: number) {
    return this.sprintService.findByTaskId(taskId);
  }

  @Get('status/:status')
  findByStatus(@Param('status') status: string) {
    return this.sprintService.findByStatus(status);
  }
}
