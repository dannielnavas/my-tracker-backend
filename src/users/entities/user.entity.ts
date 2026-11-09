import { Settings } from '../../settings/entities/settings.entity';
import { Sprints } from '../../sprints/entities/sprint.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionPlans } from './subscriptionPlans';

@Entity()
@Index('IDX_USERS_EMAIL', ['email'], { unique: true })
@Index(['stripe_customer_id'])
export class Users {
  @PrimaryGeneratedColumn()
  user_id: number;
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  email: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  full_name: string;
  @Column({
    type: 'text',
    nullable: true,
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
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {
      email_notifications: true,
      dark_mode: true,
      task_reminders: true,
    },
  })
  preferences?: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripe_customer_id?: string;
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
