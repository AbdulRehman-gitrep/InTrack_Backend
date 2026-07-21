import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('activity')
export class Activity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.activities)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  actionType!: string;

  @Column()
  entityType!: string;

  @Column()
  entityId!: number;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
