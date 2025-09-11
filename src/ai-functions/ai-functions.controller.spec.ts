import { Test, TestingModule } from '@nestjs/testing';
import { AiFunctionsController } from './ai-functions.controller';

describe('AiFunctionsController', () => {
  let controller: AiFunctionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiFunctionsController],
    }).compile();

    controller = module.get<AiFunctionsController>(AiFunctionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
