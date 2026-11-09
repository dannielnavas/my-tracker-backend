import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

/**
 * Query params for GET /tasks — extends PaginationDto so `sprint_id`
 * passes the global whitelist/forbidNonWhitelisted validation pipe.
 * Without this, `?sprint_id=37` fails with "property sprint_id should not exist".
 */
export class ListTasksQueryDto extends PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ description: 'Sprint id to list tasks for.' })
  readonly sprint_id: number;
}
