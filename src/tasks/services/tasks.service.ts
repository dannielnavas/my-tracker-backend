import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto } from '../dtos/tasks.dto';
import { Tasks } from '../entities/tasks.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(@InjectRepository(Tasks) private tasksRepo: Repository<Tasks>) {}

  async create(data: CreateTaskDto) {
    const newTask = this.tasksRepo.create({
      ...data,
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
    this.logger.log(new Date(new Date().setDate(new Date().getDate() - 1)));
    console.log(new Date(new Date().setDate(new Date().getDate() - 1)));
    const tasks = await this.tasksRepo.find({
      where: {
        sprint: { sprint_id: sprintId },
        statusTask: { status_task_id: 3 },
        date_end: LessThan(dateReport),
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
