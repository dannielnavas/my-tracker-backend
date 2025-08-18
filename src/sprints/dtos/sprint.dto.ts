import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

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
  @IsNotEmpty()
  @ApiProperty({ description: 'The status of the Sprint.' })
  readonly status: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'The task id of the Sprint.', required: false })
  readonly task_id?: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The user id of the Sprint.' })
  readonly user_id: number;
}

export class UpdateSprintDto extends PartialType(SprintsDto) {}
