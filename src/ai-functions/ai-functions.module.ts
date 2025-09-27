import { Module } from '@nestjs/common';
import { PromptModule } from 'src/prompt/prompt.module';
import { TasksModule } from 'src/tasks/tasks.module';
import { AiFunctionsController } from './ai-functions.controller';
import { AiFunctionsService } from './ai-functions.service';

@Module({
  controllers: [AiFunctionsController],
  providers: [AiFunctionsService],
  exports: [AiFunctionsService],
  imports: [TasksModule, PromptModule],
})
export class AiFunctionsModule {}
