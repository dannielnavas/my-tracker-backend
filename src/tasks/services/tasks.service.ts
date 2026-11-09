import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { PlanLimitedException } from '../../common/exceptions/plan-limited.exception';
import { Between, DataSource, Repository } from 'typeorm';
import {
  CreateTaskDto,
  ReorderTasksDto,
  TASK_STATUS_IDS,
  UpdateTaskDto,
} from '../dtos/tasks.dto';
import { Tasks } from '../entities/tasks.entity';
import { Sprints } from '../../sprints/entities/sprint.entity';
import { UsersService } from '../../users/services/users.service';

const FREE_TASK_LIMIT = 30;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Tasks) private tasksRepo: Repository<Tasks>,
    @InjectRepository(Sprints) private sprintRepo: Repository<Sprints>,
    private usersService: UsersService,
    @Optional()
    @InjectDataSource()
    private dataSource?: DataSource,
  ) {}

  private assertValidStatus(statusTaskId: number) {
    if (!(TASK_STATUS_IDS as readonly number[]).includes(statusTaskId)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'status_task_id must be 1, 2 or 3',
      });
    }
  }

  private assertOwnsSprint(
    sprint: Sprints,
    requesterUserId?: number,
    role?: string,
  ) {
    if (requesterUserId === undefined || role === 'admin') return;
    const ownerId = (sprint as any).user?.user_id;
    if (ownerId !== undefined && ownerId !== requesterUserId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not the sprint owner',
      });
    }
  }

  async create(data: CreateTaskDto, requesterUserId?: number, role?: string) {
    this.assertValidStatus(data.status_task_id);

    const sprint = await this.sprintRepo.findOne({
      where: { sprint_id: data.sprint_id },
      relations: ['user'],
    });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    this.assertOwnsSprint(sprint, requesterUserId, role);

    const userId = sprint.user.user_id;
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Sprint owner user not found');
    }

    if (user.subscriptionPlan?.subscription_plan_id === 1) {
      const taskCount = await this.tasksRepo
        .createQueryBuilder('task')
        .innerJoin('task.sprint', 'sprint')
        .innerJoin('sprint.user', 'user')
        .where('user.user_id = :userId', { userId })
        .getCount();

      if (taskCount >= FREE_TASK_LIMIT) {
        throw new PlanLimitedException('tasks', FREE_TASK_LIMIT);
      }
    }

    // Server controls date_end: set only on completion, client value is ignored.
    const date_end = data.status_task_id === 3 ? new Date() : null;

    const newTask = this.tasksRepo.create({
      title: data.title,
      description: data.description,
      position: data.position,
      date_end,
      sprint: { sprint_id: data.sprint_id },
      statusTask: { status_task_id: data.status_task_id },
    });
    return this.tasksRepo.save(newTask);
  }

  async getAllTasksForSprint(
    sprintId: number,
    requesterUserId?: number,
    role?: string,
  ) {
    if (requesterUserId !== undefined && role !== 'admin') {
      const sprint = await this.sprintRepo.findOne({
        where: { sprint_id: sprintId },
        relations: ['user'],
      });
      if (!sprint) throw new NotFoundException('Sprint not found');
      this.assertOwnsSprint(sprint, requesterUserId, role);
    }
    const tasks = await this.tasksRepo.find({
      where: { sprint: { sprint_id: sprintId } },
      relations: ['statusTask'],
      order: { position: 'ASC', task_id: 'ASC' },
    });
    return tasks;
  }

  async updateTask(
    id: number,
    payload: UpdateTaskDto,
    requesterUserId?: number,
    role?: string,
  ) {
    const task = await this.tasksRepo.findOne({
      where: { task_id: id },
      relations: ['statusTask', 'sprint', 'sprint.user'],
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    // Ownership via sprint owner
    const ownerId = (task as any).sprint?.user?.user_id;
    if (
      requesterUserId !== undefined &&
      role !== 'admin' &&
      ownerId !== undefined &&
      ownerId !== requesterUserId
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not the task owner',
      });
    }

    if (payload.status_task_id !== undefined) {
      this.assertValidStatus(payload.status_task_id);
    }

    // Never trust client timestamps: date_end is server-controlled, created_at/updated_at ignored.
    const { date_end: _ignoredDateEnd, ...rest } = payload as any;
    void _ignoredDateEnd;

    // Move to another sprint: target sprint must exist and be owned by same user
    if (rest.sprint_id && rest.sprint_id !== task.sprint?.sprint_id) {
      const targetSprint = await this.sprintRepo.findOne({
        where: { sprint_id: rest.sprint_id },
        relations: ['user'],
      });
      if (!targetSprint) throw new NotFoundException('Target sprint not found');
      this.assertOwnsSprint(targetSprint, requesterUserId, role);
      // date_end rule: moving keeps completion state; if completed, keep original date_end unless status changes below.
    } else {
      delete rest.sprint_id;
    }

    const {
      status_task_id: newStatusId,
      sprint_id: newSprintId,
      ...scalar
    } = rest;
    const previousStatusId = task.statusTask?.status_task_id;

    this.tasksRepo.merge(task, scalar);

    if (newStatusId !== undefined) {
      task.statusTask = { status_task_id: newStatusId } as any;
      if (newStatusId === 3) {
        // Server sets completion time; preserve existing if already completed.
        if (previousStatusId !== 3 || !task.date_end) {
          task.date_end = new Date();
        }
      } else {
        task.date_end = null;
      }
    } else if (newSprintId !== undefined) {
      task.sprint = { sprint_id: newSprintId } as any;
    }

    const saved = await this.tasksRepo.save(task);
    return this.tasksRepo.findOne({
      where: { task_id: saved.task_id },
      relations: ['statusTask'],
    });
  }

  async reorderTasks(
    dto: ReorderTasksDto,
    requesterUserId?: number,
    role?: string,
  ) {
    const items = dto.tasks ?? [];
    if (!items.length) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'tasks must not be empty',
      });
    }
    const ids = items.map((i) => i.task_id);
    const positions = items.map((i) => i.position);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Duplicate task_id in reorder',
      });
    }
    if (new Set(positions).size !== positions.length) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Duplicate position in reorder',
      });
    }
    for (const p of positions) {
      if (!Number.isInteger(p) || p < 1) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'position must be integer >= 1',
        });
      }
    }

    // Validate all tasks exist & belong to same sprint/user before transaction
    const tasks = await this.tasksRepo.find({
      where: ids.map((id) => ({ task_id: id })),
      relations: ['sprint', 'sprint.user'],
    });
    if (tasks.length !== ids.length) {
      throw new NotFoundException('One or more tasks not found');
    }
    const sprintIds = new Set(tasks.map((t) => (t as any).sprint?.sprint_id));
    if (sprintIds.size > 1) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'All tasks must belong to the same sprint',
      });
    }
    if (dto.sprint_id !== undefined && !sprintIds.has(dto.sprint_id)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Tasks do not belong to the given sprint_id',
      });
    }
    // Ownership: all tasks owned by requester (or admin)
    if (requesterUserId !== undefined && role !== 'admin') {
      for (const t of tasks) {
        const ownerId = (t as any).sprint?.user?.user_id;
        if (ownerId !== undefined && ownerId !== requesterUserId) {
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Not the task owner',
          });
        }
      }
    }

    const positionById = new Map(items.map((i) => [i.task_id, i.position]));

    const apply = async (repo: Repository<Tasks>) => {
      for (const task of tasks) {
        const pos = positionById.get(task.task_id);
        if (pos !== undefined) {
          await repo.update(task.task_id, { position: pos } as any);
        }
      }
    };

    if (this.dataSource) {
      await this.dataSource.transaction(async (manager) => {
        await apply(manager.getRepository(Tasks));
      });
    } else {
      await apply(this.tasksRepo);
    }

    return this.tasksRepo.find({
      where: { sprint: { sprint_id: [...sprintIds][0] } },
      relations: ['statusTask'],
      order: { position: 'ASC', task_id: 'ASC' },
    });
  }

  // get count task pending
  async getCountTaskPending(sprintId: number) {
    return this.tasksRepo.count({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 1 },
      },
    });
  }

  // get count task completed
  async getCountTaskCompleted(sprintId: number) {
    return this.tasksRepo.count({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 3 },
      },
    });
  }

  // get count task in progress
  async getCountTaskInProgress(sprintId: number) {
    return this.tasksRepo.count({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 2 },
      },
    });
  }

  async getTasksBySprintIdPreviousDay(sprintId: number, dateReport: Date) {
    this.logger.log(`Getting tasks by sprint id ${sprintId}`);
    const startOfDay = new Date(dateReport);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateReport);
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await this.tasksRepo.find({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 3 },
        date_end: Between(startOfDay, endOfDay),
      },
      relations: ['statusTask'],
    });
    return tasks;
  }

  async getTasksBySprintIdToday(sprintId: number) {
    const tasks = await this.tasksRepo.find({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 2 },
      },
      relations: ['statusTask', 'sprint'],
    });
    return tasks;
  }
}
