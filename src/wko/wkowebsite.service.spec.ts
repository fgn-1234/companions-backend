import { Test, TestingModule } from '@nestjs/testing';
import { WkowebsiteService } from './wkowebsite.service';

describe('WkowebsiteService', () => {
  let service: WkowebsiteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WkowebsiteService],
    }).compile();

    service = module.get<WkowebsiteService>(WkowebsiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
