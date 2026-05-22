import { Test, TestingModule } from '@nestjs/testing';
import { PromptService } from './prompt.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Prompt } from '../entities/prompt.entity';

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        {
          provide: getRepositoryToken(Prompt),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
