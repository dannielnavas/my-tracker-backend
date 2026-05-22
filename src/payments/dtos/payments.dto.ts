import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['monthly', 'lifetime'])
  @ApiProperty({ description: 'The key of the plan to purchase (monthly or lifetime).' })
  readonly plan_key: 'monthly' | 'lifetime';
}
