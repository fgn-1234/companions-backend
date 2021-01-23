import { Test, TestingModule } from '@nestjs/testing';
import { WkoService } from './wko.service';

describe('WkoService', () => {
  let service: WkoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WkoService],
    }).compile();

    service = module.get<WkoService>(WkoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
