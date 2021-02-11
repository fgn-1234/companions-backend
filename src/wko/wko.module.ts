import { Module } from '@nestjs/common';
import { WkoService } from './wko.service';
import { WkoController } from './wko.controller';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoCategory } from './entities/wkocategory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WkoLocation } from './entities/wkolocation.entity';
import { TreeEntity } from './entities/treeentity.entity';
import { WkowebsiteService } from './wkowebsite.service';
import { BullModule } from '@nestjs/bull';
import { WkoLoadDataProcessor } from './wko.loaddata.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WkoCategory,
      WkoCompany,
      WkoLocation,
      TreeEntity
    ]),
    BullModule.registerQueue({
      name: 'audio',
    })],
  providers: [WkoService, WkowebsiteService, WkoLoadDataProcessor],
  controllers: [WkoController]
})
export class WkoModule { }
