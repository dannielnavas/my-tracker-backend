import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prompt } from './entities/prompt.entity';
import { PromptService } from './service/prompt.service';

@Module({
  providers: [PromptService],
  imports: [TypeOrmModule.forFeature([Prompt])],
  exports: [PromptService],
})
export class PromptModule {}
