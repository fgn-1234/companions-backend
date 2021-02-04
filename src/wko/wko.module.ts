import { Module } from '@nestjs/common';
import { WkoService } from './wko.service';
import { WkoController } from './wko.controller';
import { WkoCompany } from './entities/wkocompany.entity';
import { WkoCategory } from './entities/wkocategory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WkoLocation } from './entities/wkolocation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WkoCategory, WkoCompany, WkoLocation])],
  providers: [WkoService],
  controllers: [WkoController]
})
export class WkoModule {}
