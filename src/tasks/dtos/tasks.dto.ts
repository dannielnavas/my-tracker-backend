import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The title of the Task.' })
  readonly title: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'The description of the Task.' })
  readonly description: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The subscription plan id of the Task.' })
  readonly status_task_id: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The position of the Task.' })
  readonly position: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The user id of the Task.' })
  readonly user_id: number;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
