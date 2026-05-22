import { Test, TestingModule } from '@nestjs/testing';
import { EmailsService } from './emails.service';
import config from 'src/config';

describe('EmailsService', () => {
  let service: EmailsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailsService,
        {
          provide: config.KEY,
          useValue: {
            apiKeyResend: 're_123456789',
          },
        },
      ],
    }).compile();

    service = module.get<EmailsService>(EmailsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
