import { Controller, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth/jwt-auth.guard';
import { SprintService } from '../services/sprint.service';

@Controller('sprints')
@ApiTags('Sprints')
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(private readonly sprintService: SprintService) {}

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.sprintService.delete(id);
  }
}
