import { Test, TestingModule } from '@nestjs/testing';
import { AiFunctionsService } from './ai-functions.service';

describe('AiFunctionsService', () => {
  let service: AiFunctionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiFunctionsService],
    }).compile();

    service = module.get<AiFunctionsService>(AiFunctionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
