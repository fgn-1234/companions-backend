import { HttpModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WkoModule } from './wko/wko.module';
import { WkoCategory } from './wko/entities/wkocategory.entity';
import { WkoCompany } from './wko/entities/wkocompany.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WkoLocation } from './wko/entities/wkolocation.entity';
import { TreeEntity } from './wko/entities/treeentity.entity';
import { BullModule } from '@nestjs/bull';
import { IamModule } from './iam/iam.module';
import { IamService } from './iam/iam.service';
import { WkoCompanyInteraction } from './wko/entities/wkocompanyinteraction.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'abc',
      database: 'wko',
      entities: [WkoCategory, WkoCompany, WkoLocation, TreeEntity, WkoCompanyInteraction],
      synchronize: true,
    }),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    WkoModule, HttpModule, IamModule
  ],
  controllers: [AppController],
  providers: [AppService, IamService],
})
export class AppModule { }
