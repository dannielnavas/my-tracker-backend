import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto } from '../dtos/tasks.dto';
import { Tasks } from '../entities/tasks.entity';
import { Sprints } from '../../sprints/entities/sprint.entity';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Tasks) private tasksRepo: Repository<Tasks>,
    @InjectRepository(Sprints) private sprintRepo: Repository<Sprints>,
    private usersService: UsersService,
  ) {}

  async create(data: CreateTaskDto) {
    // 1. Get the sprint and the user who owns it
    const sprint = await this.sprintRepo.findOne({
      where: { sprint_id: data.sprint_id },
      relations: ['user'],
    });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const userId = sprint.user.user_id;
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Sprint owner user not found');
    }

    // 2. Validate Free Plan Limits (max 30 tasks total across all sprints)
    if (user.subscriptionPlan && user.subscriptionPlan.subscription_plan_id === 1) {
      const taskCount = await this.tasksRepo
        .createQueryBuilder('task')
        .innerJoin('task.sprint', 'sprint')
        .innerJoin('sprint.user', 'user')
        .where('user.user_id = :userId', { userId })
        .getCount();

      if (taskCount >= 30) {
        throw new ForbiddenException(
          'Limit of 30 tasks reached for Free plan. Please upgrade your subscription.',
        );
      }
    }

    // 3. Set completion date if status is Completed (3)
    let date_end = data.date_end;
    if (data.status_task_id === 3 && !date_end) {
      date_end = new Date();
    }

    const newTask = this.tasksRepo.create({
      ...data,
      date_end,
      sprint: { sprint_id: data.sprint_id },
      statusTask: { status_task_id: data.status_task_id },
    });
    return this.tasksRepo.save(newTask);
  }

  async getAllTasksForSprint(sprintId: number) {
    const tasks = await this.tasksRepo.find({
      where: { sprint: { sprint_id: sprintId } },
      relations: ['statusTask'],
    });
    if (!tasks) {
      throw new NotFoundException('Tasks not found');
    }
    return tasks;
  }

  async updateTask(id: number, payload: UpdateTaskDto) {
    const task = await this.tasksRepo.findOne({ where: { task_id: id } });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    this.tasksRepo.merge(task, payload);

    if (payload.status_task_id) {
      task.statusTask = { status_task_id: payload.status_task_id } as any;
      if (payload.status_task_id === 3) {
        task.date_end = payload.date_end || new Date();
      } else {
        task.date_end = payload.date_end || null;
      }
    }

    if (payload.sprint_id) {
      task.sprint = { sprint_id: payload.sprint_id } as any;
    }
    return this.tasksRepo.save(task);
  }

  // get count task pending
  async getCountTaskPending(sprintId: number) {
    const tasks = await this.tasksRepo.find({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 1 },
      },
    });
    return tasks.length;
  }

  // get count task completed
  async getCountTaskCompleted(sprintId: number) {
    const tasks = await this.tasksRepo.find({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 3 },
      },
    });
    return tasks.length;
  }

  // get count task in progress
  async getCountTaskInProgress(sprintId: number) {
    const tasks = await this.tasksRepo.find({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 2 },
      },
    });
    return tasks.length;
  }

  async getTasksBySprintIdPreviousDay(sprintId: number, dateReport: Date) {
    this.logger.log(`Getting tasks by sprint id ${sprintId}`);
    this.logger.log('dateReport', dateReport);
    console.log('dateReport', dateReport);

    // Crear el rango de fechas desde las 00:00 hasta las 23:59:59.999
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
    if (!tasks) {
      throw new NotFoundException('Tasks not found');
    }
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
