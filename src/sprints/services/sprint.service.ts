import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanLimitedException } from 'src/common/exceptions/plan-limited.exception';
import config from 'src/config';
import { TasksService } from 'src/tasks/services/tasks.service';
import { Repository } from 'typeorm';
import { SprintsDto, UpdateSprintDto } from '../dtos/sprint.dto';
import { Sprints } from '../entities/sprint.entity';
import { UsersService } from 'src/users/services/users.service';

const FREE_SPRINT_LIMIT = 2;

@Injectable()
export class SprintService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(Sprints)
    private sprintRepository: Repository<Sprints>,
    private tasksService: TasksService,
    private usersService: UsersService,
  ) {}

  /**
   * Create sprint for token user. data.user_id (if sent by frontend) is IGNORED.
   * @param requesterUserId from JWT payload (sub)
   */
  async create(data: SprintsDto, requesterUserId?: number) {
    const user_id = requesterUserId ?? data.user_id;
    if (!user_id) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'User identity required',
      });
    }
    const { user_id: _ignored, task_id: _taskId, ...sprintData } = data as any;
    void _ignored;
    void _taskId;

    const user = await this.usersService.findOne(user_id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.subscriptionPlan?.subscription_plan_id === 1) {
      const sprintCount = await this.sprintRepository.count({
        where: { user: { user_id } },
      });
      if (sprintCount >= FREE_SPRINT_LIMIT) {
        throw new PlanLimitedException('sprints', FREE_SPRINT_LIMIT);
      }
    }

    const newSprint = this.sprintRepository.create({
      ...sprintData,
      user: { user_id },
    });
    return this.sprintRepository.save(newSprint);
  }

  async findAll(requesterUserId?: number) {
    if (requesterUserId !== undefined) {
      return this.sprintRepository.find({
        where: { user: { user_id: requesterUserId } },
      });
    }
    return this.sprintRepository.find();
  }

  async findOne(id: number) {
    return this.sprintRepository.findOne({
      where: { sprint_id: id },
      relations: ['user'],
    });
  }

  private assertOwnsSprint(
    sprint: Sprints,
    requesterUserId?: number,
    role?: string,
  ) {
    if (requesterUserId === undefined) return;
    if (role === 'admin') return;
    const ownerId = (sprint as any).user?.user_id;
    if (ownerId !== undefined && ownerId !== requesterUserId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not the sprint owner',
      });
    }
  }

  async update(
    id: number,
    changes: UpdateSprintDto,
    requesterUserId?: number,
    role?: string,
  ) {
    const sprint = await this.findOne(id);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    this.assertOwnsSprint(sprint, requesterUserId, role);

    // user_id from client is always ignored (owner = token user, immutable here).
    const { user_id: _u, task_id: _t, ...sprintChanges } = changes as any;
    void _u;
    void _t;
    this.sprintRepository.merge(sprint, sprintChanges);
    return this.sprintRepository.save(sprint);
  }

  async delete(id: number, requesterUserId?: number, role?: string) {
    const sprint = await this.findOne(id);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    this.assertOwnsSprint(sprint, requesterUserId, role);
    return this.sprintRepository.delete(id);
  }

  async findByUserId(userId: number, requesterUserId?: number, role?: string) {
    if (
      requesterUserId !== undefined &&
      role !== 'admin' &&
      userId !== requesterUserId
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cannot list another user sprints',
      });
    }
    const sprints = await this.sprintRepository
      .find({
        where: { user: { user_id: userId } },
      })
      .then((sprints) => {
        return sprints
          .sort((a, b) => {
            return (
              new Date(a.start_date).getTime() -
              new Date(b.start_date).getTime()
            );
          })
          .filter((sprint) => sprint.status !== 'completed')
          .slice(0, 5);
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

  async findByTaskId(taskId: number, requesterUserId?: number) {
    const sprints = await this.sprintRepository.find({
      where: { tasks: { task_id: taskId } },
      relations: ['user'],
    });
    if (requesterUserId !== undefined) {
      const owned = sprints.filter(
        (s: any) => s.user?.user_id === requesterUserId,
      );
      // If none owned, hide existence with 404 for generic callers
      if (owned.length === 0) throw new NotFoundException('Sprint not found');
      return owned;
    }
    return sprints;
  }

  async findByStatus(status: string, requesterUserId?: number) {
    if (requesterUserId !== undefined) {
      return this.sprintRepository.find({
        where: { status, user: { user_id: requesterUserId } },
      });
    }
    return this.sprintRepository.find({ where: { status } });
  }
}
