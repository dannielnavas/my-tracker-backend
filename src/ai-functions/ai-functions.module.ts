import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromptModule } from 'src/prompt/prompt.module';
import { TasksModule } from 'src/tasks/tasks.module';
import { Sprints } from 'src/sprints/entities/sprint.entity';
import { AiFunctionsController } from './ai-functions.controller';
import { AiFunctionsService } from './ai-functions.service';

@Module({
  controllers: [AiFunctionsController],
  providers: [AiFunctionsService],
  exports: [AiFunctionsService],
  imports: [TypeOrmModule.forFeature([Sprints]), TasksModule, PromptModule],
})
export class AiFunctionsModule {}
