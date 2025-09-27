import { IsString } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('prompts')
export class Prompt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsString()
  prompt: string;
}
