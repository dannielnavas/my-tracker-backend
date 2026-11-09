import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromptModule } from '../prompt/prompt.module';
import { TasksModule } from '../tasks/tasks.module';
import { Sprints } from '../sprints/entities/sprint.entity';
import { AiFunctionsController } from './ai-functions.controller';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { AiFunctionsService } from './ai-functions.service';

@Module({
  controllers: [AiFunctionsController],
  providers: [AiFunctionsService],
  exports: [AiFunctionsService],
  imports: [
    TypeOrmModule.forFeature([Sprints, AiUsageLog]),
    TasksModule,
    PromptModule,
  ],
})
export class AiFunctionsModule {}
