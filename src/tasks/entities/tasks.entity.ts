import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from '../../users/entities/user.entity';
import { StatusTasks } from './statusTasks.entity';

@Entity()
export class Tasks {
  @PrimaryGeneratedColumn()
  task_id: number;
  @Column({
    type: 'varchar',
    length: 255,
  })
  title: string;
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  description: string;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'create_at',
  })
  created_at: Date;
  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'update_at',
  })
  updated_at: Date;

  @ManyToOne(() => Users, (user) => user.tasks)
  user: Users;

  @ManyToOne(() => StatusTasks, (statusTasks) => statusTasks.tasks, {
    nullable: true,
  })
  @JoinColumn({ name: 'status_task_id' })
  statusTask: StatusTasks;
}
