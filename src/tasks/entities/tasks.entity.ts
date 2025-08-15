import { Sprints } from 'src/sprints/entities/sprint.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
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
  @Column({
    type: 'int',
    nullable: true,
  })
  position: number;
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

  @ManyToOne(() => StatusTasks, (statusTasks) => statusTasks.tasks, {
    nullable: true,
  })
  @JoinColumn({ name: 'status_task_id' })
  statusTask: StatusTasks;

  @ManyToOne(() => Sprints, (sprint) => sprint.tasks)
  sprint: Sprints;
}
