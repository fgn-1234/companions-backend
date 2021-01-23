import { Test, TestingModule } from '@nestjs/testing';
import { WkoController } from './wko.controller';

describe('WkoController', () => {
  let controller: WkoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WkoController],
    }).compile();

    controller = module.get<WkoController>(WkoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
