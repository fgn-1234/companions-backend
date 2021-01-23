import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WkoModule } from './wko/wko.module';
import { WkoCategory } from './wko/entities/wkocategory.entity';
import { Company } from './wko/entities/company.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WkoLocation } from './wko/entities/wkolocation.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'abc',
      database: 'wko',
      entities: [WkoCategory, Company, WkoLocation],
      synchronize: true,
    }),
    WkoModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
