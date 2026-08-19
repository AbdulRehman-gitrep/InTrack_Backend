import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('intern_info')
export class InternInfo {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, (user) => user.internInfo)
  @JoinColumn({ name: 'internId' })
  intern!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'managerId' })
  manager!: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'buddyId' })
  buddy!: User | null;

  @Column({ type: 'date', nullable: true })
  internshipStartDate!: Date | null;

  @Column({ type: 'date', nullable: true })
  internshipEndDate!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
