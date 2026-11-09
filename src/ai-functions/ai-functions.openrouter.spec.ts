import { Test, TestingModule } from '@nestjs/testing';
import {
  AiFunctionsService,
  DEFAULT_FREE_OPENROUTER_MODEL,
  isFreeOpenRouterModel,
} from './ai-functions.service';
import config from '../config';
import { TasksService } from '../tasks/services/tasks.service';
import { PromptService } from '../prompt/service/prompt.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sprints } from '../sprints/entities/sprint.entity';

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
          model: 'google/gemma-4-31b-it:free',
          baseUrl: 'https://openrouter.ai/api/v1',
          siteUrl: 'http://localhost:4200',
          appTitle: 'Focus Loop',
        },
      },
    });
    const resolved = service.resolveAiClient();
    expect(resolved?.provider).toBe('openrouter');
    expect(resolved?.model).toBe('google/gemma-4-31b-it:free');
  });

  it('accepts the openrouter/free router alias as a free model', async () => {
    const service = await buildService({
      apiOpenAi: 'sk-legacy',
      ai: {
        provider: 'openrouter',
        openrouter: { apiKey: 'sk-or-v1-test', model: 'openrouter/free' },
      },
    });
    expect(service.resolveAiClient()?.model).toBe('openrouter/free');
  });

  it('replaces a paid model with the free default instead of charging', async () => {
    const service = await buildService({
      apiOpenAi: 'sk-legacy',
      ai: {
        provider: 'openrouter',
        openrouter: { apiKey: 'sk-or-v1-test', model: 'openai/gpt-4o-mini' },
      },
    });
    expect(service.resolveAiClient()?.model).toBe(
      DEFAULT_FREE_OPENROUTER_MODEL,
    );
  });

  it('defaults to the free model when OPENROUTER_MODEL is unset', async () => {
    const service = await buildService({
      apiOpenAi: 'sk-legacy',
      ai: {
        provider: 'openrouter',
        openrouter: { apiKey: 'sk-or-v1-test' },
      },
    });
    expect(service.resolveAiClient()?.model).toBe(
      DEFAULT_FREE_OPENROUTER_MODEL,
    );
  });

  it('classifies only :free and openrouter/free as free models', () => {
    expect(isFreeOpenRouterModel('openrouter/free')).toBe(true);
    expect(isFreeOpenRouterModel('google/gemma-4-31b-it:free')).toBe(true);
    expect(isFreeOpenRouterModel('openai/gpt-4o-mini')).toBe(false);
    expect(isFreeOpenRouterModel('openrouter/free-test-model')).toBe(false);
    expect(isFreeOpenRouterModel(undefined)).toBe(false);
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
        openrouter: { apiKey: 'sk-or-v1-test', model: 'test/model:free' },
      },
    });
    expect(service.resolveAiClient()?.provider).toBe('openrouter');
  });
});
