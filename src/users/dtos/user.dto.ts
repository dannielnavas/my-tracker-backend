import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateUserDto {
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
  @IsOptional()
  @ApiProperty({
    description: 'The subscription plan id of the User.',
    required: false,
  })
  readonly subscription_plan_id?: number;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
