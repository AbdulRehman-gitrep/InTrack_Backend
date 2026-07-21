import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { InternInfo } from './intern-info.entity';
import { Task } from './task.entity';
import { Report } from './report.entity';
import { Feedback } from './feedback.entity';
import { Activity } from './activity.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'enum', enum: Role })
  role!: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column()
  department!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToOne(() => InternInfo, (internInfo) => internInfo.intern)
  internInfo?: InternInfo;

  @OneToMany(() => Task, (task) => task.manager)
  tasksCreated!: Task[];

  @OneToMany(() => Task, (task) => task.intern)
  tasksAssigned!: Task[];

  @OneToMany(() => Report, (report) => report.intern)
  reports!: Report[];

  @OneToMany(() => Feedback, (feedback) => feedback.sender)
  sentFeedback!: Feedback[];

  @OneToMany(() => Feedback, (feedback) => feedback.receiver)
  receivedFeedback!: Feedback[];

  @OneToMany(() => Activity, (activity) => activity.user)
  activities!: Activity[];
}
