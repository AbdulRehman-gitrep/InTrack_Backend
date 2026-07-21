import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.sentFeedback)
  @JoinColumn({ name: 'fromId' })
  sender!: User;

  @ManyToOne(() => User, (user) => user.receivedFeedback)
  @JoinColumn({ name: 'toId' })
  receiver!: User;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
