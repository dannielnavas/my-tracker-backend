import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class SubscriptionPlans {
  @PrimaryGeneratedColumn()
  subscription_plan_id: number;
  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  price: number;
  @Column({
    type: 'varchar',
    length: 255,
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

  // 1:1 bidirectional es solo en la entidad
  @OneToOne(() => User, (user) => user.subscription_plan_id, { nullable: true })
  user: User;
}
