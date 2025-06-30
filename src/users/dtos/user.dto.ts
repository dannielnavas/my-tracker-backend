import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The user id of the User.' })
  readonly user_id: number;

  @IsString()
  @IsEmail()
  @ApiProperty({ description: 'The email of the User.' })
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The full name of the User.' })
  readonly full_name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The profile image of the User.' })
  readonly profile_image: string;

  @IsNotEmpty()
  @ApiProperty({ description: 'The role of the User.' })
  readonly role: string;

  @IsString()
  @IsNotEmpty()
  @Length(6)
  @ApiProperty({ description: 'The password of the User.' })
  readonly password: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The subscription plan id of the User.' })
  readonly subscription_plan_id: number;

  @IsDate()
  @IsNotEmpty()
  @ApiProperty({ description: 'The created at of the User.' })
  readonly created_at: Date;

  @IsDate()
  @IsNotEmpty()
  @ApiProperty({ description: 'The updated at of the User.' })
  readonly updated_at: Date;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
