import { Tasks } from 'src/tasks/entities/tasks.entity';
import { Users } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Sprints {
  @PrimaryGeneratedColumn()
  sprint_id: number;
  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  description: string;
  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  start_date: Date;
  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  end_date: Date;
  @Column({
    type: 'varchar',
    length: 255,
  })
  status: string;
  @OneToMany(() => Tasks, (task) => task.sprint)
  tasks: Tasks[];

  @ManyToOne(() => Users, (user) => user.sprints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;
}
