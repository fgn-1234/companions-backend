import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { IamService } from './iam/iam.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, 
    private readonly iamService: IamService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("iam")
  getIam(): Promise<string> {
    return this.iamService.getGemeindeFromOrtAndPLZ("Neuzeug", "4523");
  }
}
