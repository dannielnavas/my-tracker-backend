import { Test, TestingModule } from '@nestjs/testing';
import { AiFunctionsService } from './ai-functions.service';
import config from 'src/config';
import { TasksService } from 'src/tasks/services/tasks.service';
import { PromptService } from 'src/prompt/service/prompt.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sprints } from 'src/sprints/entities/sprint.entity';

describe('AiFunctionsService', () => {
  let service: AiFunctionsService;
  let sprintRepository: any;
  let tasksService: any;
  let promptService: any;

  beforeEach(async () => {
    sprintRepository = {
      findOne: jest.fn(),
    };
    tasksService = {
      getTasksBySprintIdPreviousDay: jest.fn().mockResolvedValue([]),
      getTasksBySprintIdToday: jest.fn().mockResolvedValue([]),
    };
    promptService = {
      getPrompt: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiFunctionsService,
        {
          provide: config.KEY,
          useValue: {
            apiOpenAi: 'mock',
          },
        },
        {
          provide: getRepositoryToken(Sprints),
          useValue: sprintRepository,
        },
        {
          provide: TasksService,
          useValue: tasksService,
        },
        {
          provide: PromptService,
          useValue: promptService,
        },
      ],
    }).compile();

    service = module.get<AiFunctionsService>(AiFunctionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return mock report directly for premium users (plan 2)', async () => {
    sprintRepository.findOne.mockResolvedValue({
      sprint_id: 1,
      user: {
        user_id: 10,
        subscriptionPlan: {
          subscription_plan_id: 2, // Premium
        },
      },
    });

    const result = await service.chatCompletion({
      sprint_id: 1,
      dateReport: '2026-05-22',
    });

    expect(result.role).toBe('assistant');
    expect(result.content).toContain('restricted to the Free Plan');
  });

  it('should return mock report for free users (plan 1) if api key is not set or mock', async () => {
    sprintRepository.findOne.mockResolvedValue({
      sprint_id: 1,
      user: {
        user_id: 10,
        subscriptionPlan: {
          subscription_plan_id: 1, // Free
        },
      },
    });

    const result = await service.chatCompletion({
      sprint_id: 1,
      dateReport: '2026-05-22',
    });

    expect(result.role).toBe('assistant');
    expect(result.content).toContain('because the Gemini API Key is not configured');
  });
});
