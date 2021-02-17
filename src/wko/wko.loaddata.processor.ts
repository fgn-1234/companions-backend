import { OnQueueActive, Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { WkoLoadingHistory } from "./entities/wkoloadinghistory.entity";
import { WkowebsiteService } from "./wkowebsite.service";

@Processor('audio')
export class WkoLoadDataProcessor {
  constructor(private website: WkowebsiteService) { }

  @Process()
  async transcode(job: Job<WkoLoadingHistory>) {
    console.log(job.data);
    var result = await this.website.fetchCompaniesTask(job.data);
    
    // let progress = 0;
    // for (let i = 0; i < 10; i++) {
    //   console.log(job.progress());
    //   progress += 10;
    //   job.progress(progress);
    // }
    return {};
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }
}