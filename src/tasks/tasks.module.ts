import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './controllers/tasks.controller';
import { StatusTasks } from './entities/statusTasks.entity';
import { Tasks } from './entities/tasks.entity';
import { Sprints } from '../sprints/entities/sprint.entity';
import { UsersModule } from '../users/users.module';
import { TasksService } from './services/tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tasks, StatusTasks, Sprints]),
    UsersModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
