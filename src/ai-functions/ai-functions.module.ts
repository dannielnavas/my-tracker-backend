import { Module } from '@nestjs/common';
import { TasksModule } from 'src/tasks/tasks.module';
import { AiFunctionsController } from './ai-functions.controller';
import { AiFunctionsService } from './ai-functions.service';

@Module({
  controllers: [AiFunctionsController],
  providers: [AiFunctionsService],
  exports: [AiFunctionsService],
  imports: [TasksModule],
})
export class AiFunctionsModule {}
