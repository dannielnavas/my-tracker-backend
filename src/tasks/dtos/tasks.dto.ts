import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export const TASK_STATUS_IDS = [1, 2, 3] as const;

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
  @IsIn(TASK_STATUS_IDS)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Status id: 1=Pending, 2=In Progress, 3=Completed.',
    enum: TASK_STATUS_IDS,
  })
  readonly status_task_id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @ApiProperty({ description: 'The position of the Task.' })
  readonly position: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The sprint id of the Task.' })
  readonly sprint_id: number;

  // Accepted for frontend compat but IGNORED — server sets date_end only on completion.
  @IsDate()
  @IsOptional()
  @ApiProperty({
    description: 'IGNORED — server sets date_end on completion.',
    required: false,
    deprecated: true,
  })
  readonly date_end?: Date;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The title of the Task.' })
  readonly title?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'The description of the Task.' })
  readonly description?: string;

  @IsOptional()
  @IsNumber()
  @IsIn(TASK_STATUS_IDS)
  @ApiProperty({
    description: 'Status id: 1=Pending, 2=In Progress, 3=Completed.',
    enum: TASK_STATUS_IDS,
  })
  readonly status_task_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({ description: 'The position of the Task.' })
  readonly position?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'The sprint id of the Task.' })
  readonly sprint_id?: number;

  // Accepted for frontend compat but IGNORED — server controls date_end.
  @IsOptional()
  @IsDate()
  @ApiProperty({
    description: 'IGNORED — server sets date_end on completion.',
    required: false,
    deprecated: true,
  })
  readonly date_end?: Date;
}

export class ReorderTaskItemDto {
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ description: 'Task id.' })
  readonly task_id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @ApiProperty({ description: 'New position.' })
  readonly position: number;
}

export class ReorderTasksDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: 'Sprint scope — all task_ids must belong to this sprint.',
    required: false,
  })
  readonly sprint_id?: number;

  @ValidateNested({ each: true })
  @Type(() => ReorderTaskItemDto)
  @ArrayMinSize(1)
  @ApiProperty({
    description: 'Ordered task ids with new positions.',
    type: [ReorderTaskItemDto],
  })
  readonly tasks: ReorderTaskItemDto[];
}
