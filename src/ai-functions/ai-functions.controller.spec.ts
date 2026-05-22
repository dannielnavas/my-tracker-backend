import { Test, TestingModule } from '@nestjs/testing';
import { AiFunctionsController } from './ai-functions.controller';
import { AiFunctionsService } from './ai-functions.service';

describe('AiFunctionsController', () => {
  let controller: AiFunctionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiFunctionsController],
      providers: [
        {
          provide: AiFunctionsService,
          useValue: {
            chatCompletion: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiFunctionsController>(AiFunctionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
