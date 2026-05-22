import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SprintService } from './sprint.service';
import config from 'src/config';
import { Sprints } from '../entities/sprint.entity';
import { TasksService } from 'src/tasks/services/tasks.service';
import { UsersService } from 'src/users/services/users.service';

describe('SprintService', () => {
  let service: SprintService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintService,
        {
          provide: config.KEY,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Sprints),
          useValue: {
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: TasksService,
          useValue: {},
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SprintService>(SprintService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
