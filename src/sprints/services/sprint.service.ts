import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import config from 'src/config';
import { TasksService } from 'src/tasks/services/tasks.service';
import { Repository } from 'typeorm';
import { SprintsDto, UpdateSprintDto } from '../dtos/sprint.dto';
import { Sprints } from '../entities/sprint.entity';
import { UsersService } from 'src/users/services/users.service';

@Injectable()
export class SprintService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(Sprints)
    private sprintRepository: Repository<Sprints>,
    private tasksService: TasksService,
    private usersService: UsersService,
  ) {}

  async create(data: SprintsDto) {
    const { user_id, ...sprintData } = data;

    // Check user's subscription plan limits
    const user = await this.usersService.findOne(user_id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.subscriptionPlan && user.subscriptionPlan.subscription_plan_id === 1) {
      const sprintCount = await this.sprintRepository.count({
        where: { user: { user_id } },
      });
      if (sprintCount >= 2) {
        throw new ForbiddenException(
          'Limit of 2 sprints reached for Free plan. Please upgrade your subscription.',
        );
      }
    }

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
    return this.sprintRepository.findOne({
      where: { sprint_id: id },
      relations: ['user'],
    });
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
            return a.start_date.getTime() - b.start_date.getTime();
          })
          .filter((sprint) => sprint.status !== 'completed')
          .splice(0, 5);
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
