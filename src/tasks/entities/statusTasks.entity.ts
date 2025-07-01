import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tasks } from './tasks.entity';

@Entity()
export class StatusTasks {
  @PrimaryGeneratedColumn()
  status_task_id: number;
  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

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

  @OneToMany(() => Tasks, (task) => task.statusTask)
  tasks: Tasks[];
}
