import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { Tasks } from '../entities/tasks.entity';
import { Sprints } from '../../sprints/entities/sprint.entity';
import { UsersService } from '../../users/services/users.service';

describe('TasksService reorder & plan limits', () => {
  let service: TasksService;
  let tasksRepo: any;

  beforeEach(async () => {
    tasksRepo = {
      find: jest.fn().mockResolvedValue([
        {
          task_id: 1,
          position: 1,
          sprint: { sprint_id: 10, user: { user_id: 7 } },
        },
        {
          task_id: 2,
          position: 2,
          sprint: { sprint_id: 10, user: { user_id: 7 } },
        },
      ]),
      update: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Tasks), useValue: tasksRepo },
        {
          provide: getRepositoryToken(Sprints),
          useValue: { findOne: jest.fn() },
        },
        { provide: UsersService, useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('rejects duplicate positions', async () => {
    await expect(
      service.reorderTasks(
        {
          tasks: [
            { task_id: 1, position: 1 },
            { task_id: 2, position: 1 },
          ],
        },
        7,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects tasks from different sprints', async () => {
    tasksRepo.find.mockResolvedValue([
      { task_id: 1, sprint: { sprint_id: 10, user: { user_id: 7 } } },
      { task_id: 2, sprint: { sprint_id: 11, user: { user_id: 7 } } },
    ]);
    await expect(
      service.reorderTasks(
        {
          tasks: [
            { task_id: 1, position: 1 },
            { task_id: 2, position: 2 },
          ],
        },
        7,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects reorder for another user tasks', async () => {
    tasksRepo.find.mockResolvedValue([
      { task_id: 1, sprint: { sprint_id: 10, user: { user_id: 99 } } },
    ]);
    await expect(
      service.reorderTasks({ tasks: [{ task_id: 1, position: 1 }] }, 7),
    ).rejects.toMatchObject({ status: 403 });
  });
});
