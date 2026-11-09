import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({ required: false, example: 1 })
  readonly page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({ required: false, example: 50 })
  readonly limit?: number;
}
