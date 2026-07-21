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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'managerId' })
  manager!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buddyId' })
  buddy!: User;

  @Column({ type: 'date' })
  internshipStartDate!: Date;

  @Column({ type: 'date' })
  internshipEndDate!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
