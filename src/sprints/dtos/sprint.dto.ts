import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export const SPRINT_STATUSES = ['active', 'completed', 'planned'] as const;

export class SprintsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The name of the Sprint.' })
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The description of the Sprint.' })
  readonly description: string;

  @IsDate()
  @IsNotEmpty()
  @ApiProperty({ description: 'The start date of the Sprint.' })
  readonly start_date: Date;

  @IsDate()
  @IsNotEmpty()
  @ApiProperty({ description: 'The end date of the Sprint.' })
  readonly end_date: Date;

  @IsString()
  @IsIn(SPRINT_STATUSES)
  @IsNotEmpty()
  @ApiProperty({
    description: 'The status of the Sprint.',
    enum: SPRINT_STATUSES,
  })
  readonly status: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'The task id of the Sprint.', required: false })
  readonly task_id?: number;

  // Kept so the frontend payload doesn't trip forbidNonWhitelisted; IGNORED — owner is token user_id.
  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'IGNORED — owner is taken from the JWT token.',
    required: false,
    deprecated: true,
  })
  readonly user_id?: number;
}

export class UpdateSprintDto extends PartialType(SprintsDto) {}
