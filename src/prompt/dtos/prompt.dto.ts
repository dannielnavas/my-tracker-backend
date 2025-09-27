import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Prompt {
  @PrimaryGeneratedColumn()
  prompt_id: number;
  @Column()
  prompt: string;
  @Column()
  created_at: Date;
  @Column()
  updated_at: Date;
}
