import { OnQueueActive, Process, Processor } from "@nestjs/bull";
import { Job } from "bull";

@Processor('audio')
export class WkoLoadDataProcessor {
  @Process()
  async transcode(job: Job<unknown>) {
    let progress = 0;
    for (let i = 0; i < 10; i++) {
      console.log(job.progress());
      progress += 10;
      job.progress(progress);
    }
    return {};
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }
}