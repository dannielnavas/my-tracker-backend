import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatCompletionMessage } from 'openai/resources/index';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth/jwt-auth.guard';
import { AiFunctionsService, OpenAIRequestDto } from './ai-functions.service';

@Controller('ai-functions')
@ApiTags('Ai Functions')
@UseGuards(JwtAuthGuard)
export class AiFunctionsController {
  constructor(private readonly aiFunctionsService: AiFunctionsService) {}

  @Post('generate')
  async generateResponse(
    @Body() request: OpenAIRequestDto,
  ): Promise<ChatCompletionMessage> {
    return this.aiFunctionsService.chatCompletion(request);
  }
}
