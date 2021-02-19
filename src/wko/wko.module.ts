import { HttpModule, Module } from '@nestjs/common';
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
import { IamModule } from 'src/iam/iam.module';
import { IamService } from 'src/iam/iam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WkoCategory,
      WkoCompany,
      WkoLocation,
      TreeEntity
    ]),
    BullModule.registerQueue({
      name: 'loadCompanyData',
    }),
    IamModule,
    HttpModule],
  providers: [WkoService, WkowebsiteService, WkoLoadDataProcessor, IamService],
  controllers: [WkoController]
})
export class WkoModule { }
