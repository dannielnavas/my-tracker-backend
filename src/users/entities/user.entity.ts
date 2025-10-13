import { Settings } from 'src/settings/entities/settings.entity';
import { Sprints } from 'src/sprints/entities/sprint.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionPlans } from './subscriptionPlans';

@Entity()
export class Users {
  @PrimaryGeneratedColumn()
  user_id: number;
  @Column({
    type: 'varchar',
    length: 255,
  })
  email: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  full_name: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  profile_image: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  role: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  password: string;
  @Column({
    type: 'boolean',
    default: false,
  })
  accept_terms?: boolean;
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

  // 1:1 bidirectional en base de datos, solo uno de los dos lados debe tener JoinColumn
  @ManyToOne(
    () => SubscriptionPlans,
    (subscriptionPlans) => subscriptionPlans.users,
    { nullable: true },
  )
  @JoinColumn({ name: 'subscription_plan_id' })
  subscriptionPlan: SubscriptionPlans;

  @OneToMany(() => Sprints, (sprint) => sprint.user)
  sprints: Sprints[];

  @OneToOne(() => Settings, (settings) => settings.user)
  settings: Settings;
}
