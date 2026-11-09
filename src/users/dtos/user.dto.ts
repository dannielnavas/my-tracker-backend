import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

/**
 * NOTE: role / subscription_plan_id / stripe_customer_id are accepted only so
 * the frontend payload doesn't trip `forbidNonWhitelisted`. The server IGNORES
 * them — role is always 'user', plan is always free (1), Stripe id is set server-side.
 * Same for UpdateUserDto: only full_name/email/profile_image/preferences/accept_terms apply.
 */
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
  @IsOptional()
  @ApiProperty({
    description: 'The profile image URL or base64 data URI of the User.',
  })
  readonly profile_image: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'IGNORED by server (role is always user).',
    required: false,
    deprecated: true,
  })
  readonly role?: string;

  @IsString()
  @IsNotEmpty()
  @Length(6)
  @ApiProperty({ description: 'The password of the User.' })
  readonly password: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: 'IGNORED by server (new users are always on free plan).',
    required: false,
    deprecated: true,
  })
  readonly subscription_plan_id?: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Accept the terms and conditions of the User.',
    required: false,
  })
  readonly accept_terms?: boolean;

  @IsOptional()
  @IsObject()
  @ApiProperty({
    description: 'Preferences of the user (e.g. notifications, dark mode)',
    required: false,
  })
  readonly preferences?: Record<string, any>;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'IGNORED — Stripe customer id is managed server-side.',
    required: false,
    deprecated: true,
  })
  readonly stripe_customer_id?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsEmail()
  @ApiProperty({ description: 'The email of the User.' })
  readonly email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The full name of the User.' })
  readonly full_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Profile image URL or data:image/...;base64,... URI (uploaded to storage).',
  })
  readonly profile_image?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'IGNORED by server.',
    required: false,
    deprecated: true,
  })
  readonly role?: string;

  @IsOptional()
  @IsString()
  @Length(6)
  @ApiProperty({
    description: 'IGNORED — use POST /auth/change-password.',
    required: false,
    deprecated: true,
  })
  readonly password?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: 'IGNORED by server (plan changes happen via Stripe webhook).',
    required: false,
    deprecated: true,
  })
  readonly subscription_plan_id?: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Accept the terms and conditions.',
    required: false,
  })
  readonly accept_terms?: boolean;

  @IsOptional()
  @IsObject()
  @ApiProperty({ description: 'Preferences of the user', required: false })
  readonly preferences?: Record<string, any>;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'IGNORED — managed server-side.',
    required: false,
    deprecated: true,
  })
  readonly stripe_customer_id?: string;
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
