import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Report } from './report.entity';

@Entity('report_attachments')
export class ReportAttachment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Report, (report) => report.attachments)
  @JoinColumn({ name: 'reportId' })
  report!: Report;

  @Column()
  fileName!: string;

  @Column()
  fileUrl!: string;

  @Column()
  fileType!: string;

  @Column()
  publicId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
