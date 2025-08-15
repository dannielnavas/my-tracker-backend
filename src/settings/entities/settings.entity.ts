import { Users } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  settings_id: number;
  @Column({
    type: 'varchar',
    length: 255,
  })
  cycle_time: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;
  @Column({
    type: 'varchar',
    length: 255,
  })
  image: string;

  @ManyToOne(() => Users, (user) => user.settings)
  user: Users;
}
