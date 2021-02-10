import { Module } from '@nestjs/common';
import { WkoService } from './wko.service';
import { WkoController } from './wko.controller';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoCategory } from './entities/wkocategory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WkoLocation } from './entities/wkolocation.entity';
import { TreeEntity } from './entities/treeentity.entity';
import { WkoLoadingHistory } from './entities/wkoloadinghistory.entity';
import { WkowebsiteService } from './wkowebsite.service';

@Module({
  imports: [TypeOrmModule.forFeature([WkoCategory, WkoCompany, WkoLocation, TreeEntity, WkoLoadingHistory])],
  providers: [WkoService, WkowebsiteService],
  controllers: [WkoController]
})
export class WkoModule {}
