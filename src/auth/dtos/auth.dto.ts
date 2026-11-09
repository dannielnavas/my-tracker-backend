import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Opaque refresh token issued at login.' })
  readonly refresh_token: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'Alias of refresh_token (camelCase).',
  })
  readonly refreshToken?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @Length(6)
  @ApiProperty({ description: 'Current password' })
  readonly current_password: string;

  @IsString()
  @IsNotEmpty()
  @Length(6)
  @ApiProperty({ description: 'New password' })
  readonly new_password: string;
}
