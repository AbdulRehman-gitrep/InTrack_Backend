import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { InternInfo } from '../entities/intern-info.entity';
import { Task } from '../entities/task.entity';
import { Report } from '../entities/report.entity';
import { ReportAttachment } from '../entities/report-attachment.entity';
import { Feedback } from '../entities/feedback.entity';
import { Activity } from '../entities/activity.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      InternInfo,
      Task,
      Report,
      ReportAttachment,
      Feedback,
      Activity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
