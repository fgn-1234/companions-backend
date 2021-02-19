import { OnQueueProgress, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { WkoLoadingHistory } from "./entities/wkoloadinghistory.entity";
import { WkowebsiteService } from "./wkowebsite.service";

@Processor('loadCompanyData')
export class WkoLoadDataProcessor {
  constructor(private website: WkowebsiteService) { }

  @Process()
  async processLoadCompaniesJob(job: Job<WkoLoadingHistory>) {
    Logger.debug("Start loading companies: " + JSON.stringify(job.data));
    var result = await this.website.fetchCompaniesTask(job.data, (progress) => this.reportProgressFromOutside(job, progress));
    return result;
  }

  @OnQueueProgress()
  onProgress(job: Job, progress: number) {
    Logger.debug("Job " + job.id + " progressed to " + progress + "%");
  }

  async reportProgressFromOutside(job: Job, progress: number) {
    // var activeJobs = (await queue.getJobs(["active"]));
    // activeJobs[0].progress(progress);
    job.progress(progress);
  }
}