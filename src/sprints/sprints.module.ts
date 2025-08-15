import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SprintController } from './controllers/sprint.controller';
import { Sprints } from './entities/sprint.entity';
import { SprintService } from './services/sprint.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sprints])],
  providers: [SprintService],
  controllers: [SprintController],
  exports: [SprintService],
})
export class SprintsModule {}
