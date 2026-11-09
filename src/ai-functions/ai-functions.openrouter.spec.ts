import { Test, TestingModule } from '@nestjs/testing';
import { AiFunctionsService } from './ai-functions.service';
import config from 'src/config';
import { TasksService } from 'src/tasks/services/tasks.service';
import { PromptService } from 'src/prompt/service/prompt.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sprints } from 'src/sprints/entities/sprint.entity';

async function buildService(configValue: any): Promise<AiFunctionsService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AiFunctionsService,
      { provide: config.KEY, useValue: configValue },
      { provide: getRepositoryToken(Sprints), useValue: { findOne: jest.fn() } },
      {
        provide: TasksService,
        useValue: {
          getTasksBySprintIdPreviousDay: jest.fn().mockResolvedValue([]),
          getTasksBySprintIdToday: jest.fn().mockResolvedValue([]),
        },
      },
      {
        provide: PromptService,
        useValue: { getPrompt: jest.fn().mockResolvedValue([]) },
      },
    ],
  }).compile();
  return module.get<AiFunctionsService>(AiFunctionsService);
}

describe('AiFunctionsService OpenRouter resolution', () => {
  it('auto picks OpenRouter when its key is present', async () => {
    const service = await buildService({
      apiOpenAi: 'sk-legacy',
      ai: {
        provider: 'auto',
        openrouter: {
          apiKey: 'sk-or-v1-test',
          model: 'openrouter/free-test-model',
          baseUrl: 'https://openrouter.ai/api/v1',
          siteUrl: 'http://localhost:4200',
          appTitle: 'Focus Loop',
        },
      },
    });
    const resolved = service.resolveAiClient();
    expect(resolved?.provider).toBe('openrouter');
    expect(resolved?.model).toBe('openrouter/free-test-model');
  });

  it('falls back to legacy when OpenRouter key absent', async () => {
    const service = await buildService({
      apiOpenAi: 'AIzaSy-test',
      ai: { provider: 'auto', openrouter: { apiKey: undefined } },
    });
    const resolved = service.resolveAiClient();
    expect(resolved?.provider).toBe('gemini');
    expect(resolved?.model).toBe('gemini-1.5-flash');
  });

  it('returns null in mock mode / no keys', async () => {
    const service = await buildService({
      apiOpenAi: 'mock',
      ai: { provider: 'auto', openrouter: { apiKey: undefined } },
    });
    expect(service.resolveAiClient()).toBeNull();
  });

  it('forces OpenRouter when AI_PROVIDER=openrouter even with legacy key', async () => {
    const service = await buildService({
      apiOpenAi: 'sk-legacy',
      ai: {
        provider: 'openrouter',
        openrouter: { apiKey: 'sk-or-v1-test', model: 'm' },
      },
    });
    expect(service.resolveAiClient()?.provider).toBe('openrouter');
  });
});
