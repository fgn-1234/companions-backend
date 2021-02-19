import { HttpModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { IamService } from './iam.service';

@Module({
  imports: [
    HttpModule
  ],
  providers: [IamService],
})
export class IamModule {}
