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
}
