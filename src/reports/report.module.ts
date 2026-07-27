import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../entities/report.entity';
import { ReportAttachment } from '../entities/report-attachment.entity';
import { User } from '../entities/user.entity';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report, ReportAttachment, User])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportsModule {}
