import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ReportAttachment } from './report-attachment.entity';
import { ReportStatus } from '../common/enums/report-status.enum';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.reports)
  @JoinColumn({ name: 'internId' })
  intern!: User;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status!: ReportStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => ReportAttachment, (attachment) => attachment.report)
  attachments!: ReportAttachment[];
}
