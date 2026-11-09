import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { SprintController } from './controllers/sprint.controller';
import { SprintsController } from './controllers/sprints.controller';
import { Sprints } from './entities/sprint.entity';
import { SprintService } from './services/sprint.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sprints]), TasksModule, UsersModule],
  providers: [SprintService],
  controllers: [SprintController, SprintsController],
  exports: [SprintService],
})
export class SprintsModule {}
