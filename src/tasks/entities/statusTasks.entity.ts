import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tasks } from './tasks.entity';

@Entity()
export class StatusTasks {
  @PrimaryGeneratedColumn()
  status_task_id: number;
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
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
