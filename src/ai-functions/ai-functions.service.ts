import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessage } from 'openai/resources/chat/completions';
import config from 'src/config';
import { PromptService } from 'src/prompt/service/prompt.service';
import { TasksService } from 'src/tasks/services/tasks.service';

export interface OpenAIRequestDto {
  sprint_id: number;
  dateReport: Date;
}

@Injectable()
export class AiFunctionsService {
  private openai: OpenAI;
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private tasksService: TasksService,
    private promptService: PromptService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.apiOpenAi,
    });
  }
  async chatCompletion(
    request: OpenAIRequestDto,
  ): Promise<ChatCompletionMessage> {
    console.log('request', request);
    const tasksDone = await this.tasksService.getTasksBySprintIdPreviousDay(
      request.sprint_id,
      request.dateReport,
    );
    console.log('tasksDone', tasksDone);
    const tasksToday = await this.tasksService.getTasksBySprintIdToday(
      request.sprint_id,
    );
    console.log(tasksDone);
    const prompt = await this.promptService.getPrompt();

    const promptFinal = `
    ${prompt[0].prompt}

    Tasks completed yesterday: ${tasksDone.map((task) => task.title).join(', ')}

    Tasks for today: ${tasksToday.map((task) => task.title).join(', ')}
    `;
    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: promptFinal,
        },
      ],
      model: 'gpt-4o-mini',
    });

    return completion.choices[0].message;
  }
}
