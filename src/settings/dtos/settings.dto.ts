import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SettingsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The name of the setting.' })
  readonly cycle_time: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The name of the setting.' })
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The image of the setting.' })
  readonly image: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The name of the setting.' })
  readonly user_id: number;
}
