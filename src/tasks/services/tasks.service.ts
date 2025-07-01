import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto } from '../dtos/tasks.dto';
import { Tasks } from '../entities/tasks.entity';

@Injectable()
export class TasksService {
  constructor(@InjectRepository(Tasks) private tasksRepo: Repository<Tasks>) {}

  async create(data: CreateTaskDto) {
    const newTask = this.tasksRepo.create({
      ...data,
      user: { user_id: data.user_id },
      statusTask: { status_task_id: data.status_task_id },
    });
    return this.tasksRepo.save(newTask);
  }

  async getAllTasksForUser(userId: number) {
    const tasks = await this.tasksRepo.find({
      where: { user: { user_id: userId } },
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
    return this.tasksRepo.save(task);
  }
}
