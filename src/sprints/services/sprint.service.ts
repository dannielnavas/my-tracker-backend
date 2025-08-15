import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import config from 'src/config';
import { Repository } from 'typeorm';
import { SprintsDto, UpdateSprintDto } from '../dtos/sprint.dto';
import { Sprints } from '../entities/sprint.entity';

@Injectable()
export class SprintService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(Sprints)
    private sprintRepository: Repository<Sprints>,
  ) {}

  async create(data: SprintsDto) {
    const newSprint = this.sprintRepository.create(data);
    return this.sprintRepository.save(newSprint);
  }

  async findAll() {
    return this.sprintRepository.find();
  }

  async findOne(id: number) {
    return this.sprintRepository.findOne({ where: { sprint_id: id } });
  }

  async update(id: number, changes: UpdateSprintDto) {
    const sprint = await this.findOne(id);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    this.sprintRepository.merge(sprint, changes);
    return this.sprintRepository.save(sprint);
  }

  async delete(id: number) {
    const sprint = await this.findOne(id);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    return this.sprintRepository.delete(id);
  }

  async findByUserId(userId: number) {
    return this.sprintRepository.find({ where: { user: { user_id: userId } } });
  }

  async findByTaskId(taskId: number) {
    return this.sprintRepository.find({
      where: { tasks: { task_id: taskId } },
    });
  }

  async findByStatus(status: string) {
    return this.sprintRepository.find({ where: { status } });
  }
}
