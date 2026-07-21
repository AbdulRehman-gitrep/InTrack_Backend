import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { TaskStatus } from '../common/enums/task-status.enum';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @ManyToOne(() => User, (user) => user.tasksAssigned)
  @JoinColumn({ name: 'internId' })
  intern!: User;

  @ManyToOne(() => User, (user) => user.tasksCreated)
  @JoinColumn({ name: 'managerId' })
  manager!: User;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status!: TaskStatus;

  @CreateDateColumn()
  createdAt!: Date;
}
