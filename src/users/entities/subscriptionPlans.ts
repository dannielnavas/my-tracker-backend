import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from './user.entity';

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
    nullable: true,
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

  // 1:N bidirectional: un plan puede tener varios usuarios
  @OneToMany(() => Users, (user) => user.subscriptionPlan)
  users: Users[];
}
