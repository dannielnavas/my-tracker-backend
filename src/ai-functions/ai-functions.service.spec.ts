import { Test, TestingModule } from '@nestjs/testing';
import { AiFunctionsService } from './ai-functions.service';
import config from 'src/config';
import { TasksService } from 'src/tasks/services/tasks.service';
import { PromptService } from 'src/prompt/service/prompt.service';

describe('AiFunctionsService', () => {
  let service: AiFunctionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiFunctionsService,
        {
          provide: config.KEY,
          useValue: {
            apiOpenAi: 'mock-api-key',
          },
        },
        {
          provide: TasksService,
          useValue: {
            getTasksBySprintIdPreviousDay: jest.fn(),
            getTasksBySprintIdToday: jest.fn(),
          },
        },
        {
          provide: PromptService,
          useValue: {
            getPrompt: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiFunctionsService>(AiFunctionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
