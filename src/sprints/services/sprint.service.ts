import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import config from 'src/config';
import { TasksService } from 'src/tasks/services/tasks.service';
import { Repository } from 'typeorm';
import { SprintsDto, UpdateSprintDto } from '../dtos/sprint.dto';
import { Sprints } from '../entities/sprint.entity';

@Injectable()
export class SprintService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(Sprints)
    private sprintRepository: Repository<Sprints>,
    private tasksService: TasksService,
  ) {}

  async create(data: SprintsDto) {
    const { user_id, ...sprintData } = data;
    const newSprint = this.sprintRepository.create({
      ...sprintData,
      user: { user_id },
    });
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

    const { user_id, ...sprintChanges } = changes;
    const updateData = { ...sprintChanges };

    if (user_id) {
      updateData['user'] = { user_id };
    }

    this.sprintRepository.merge(sprint, updateData);
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
    const sprints = await this.sprintRepository
      .find({
        where: { user: { user_id: userId } },
        order: {
          status: {
            direction: 'ASC',
            // Usamos un CASE para que 'activate' sea primero
            // Esto depende del soporte de la base de datos y TypeORM
            // Si no soporta directamente, se puede usar queryBuilder
          },
        },
      })
      .then((sprints) => {
        // Ordenar manualmente si el ORM no soporta CASE
        return sprints
          .sort((a, b) => {
            if (a.status === 'activate' && b.status !== 'activate') return -1;
            if (a.status !== 'activate' && b.status === 'activate') return 1;
            return 0;
          })
          .filter((sprint) => sprint.status !== 'completed');
      });
    const sprintsWithTasks = await Promise.all(
      sprints.map(async (sprint) => {
        const countTaskPending = await this.tasksService.getCountTaskPending(
          sprint.sprint_id,
        );
        const countTaskCompleted =
          await this.tasksService.getCountTaskCompleted(sprint.sprint_id);
        const countTaskInProgress =
          await this.tasksService.getCountTaskInProgress(sprint.sprint_id);
        return {
          ...sprint,
          countTaskPending,
          countTaskCompleted,
          countTaskInProgress,
        };
      }),
    );
    return sprintsWithTasks;
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
