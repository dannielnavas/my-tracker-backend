import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import OpenAI from 'openai';
import { ChatCompletionMessage } from 'openai/resources/chat/completions';
import config from 'src/config';
import { PromptService } from 'src/prompt/service/prompt.service';
import { TasksService } from 'src/tasks/services/tasks.service';
import { Repository } from 'typeorm';
import { Sprints } from 'src/sprints/entities/sprint.entity';

export class OpenAIRequestDto {
  @IsNotEmpty()
  @IsNumber()
  sprint_id: number;

  @IsNotEmpty()
  @IsString()
  dateReport: string;
}

@Injectable()
export class AiFunctionsService {
  private openai: OpenAI | null = null;
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(Sprints)
    private sprintRepo: Repository<Sprints>,
    private tasksService: TasksService,
    private promptService: PromptService,
  ) {}

  private getOpenAIClient(): OpenAI | null {
    const apiKey = this.configService.apiOpenAi;
    if (!apiKey || apiKey === 'mock' || apiKey.trim() === '') {
      return null;
    }
    if (!this.openai) {
      const options: any = { apiKey };
      if (apiKey.startsWith('AIzaSy')) {
        options.baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      }
      this.openai = new OpenAI(options);
    }
    return this.openai;
  }

  async chatCompletion(
    request: OpenAIRequestDto,
  ): Promise<ChatCompletionMessage> {
    console.log('request', request);
    const parsedDate = new Date(request.dateReport);
    const tasksDone = await this.tasksService.getTasksBySprintIdPreviousDay(
      request.sprint_id,
      parsedDate,
    );
    console.log('tasksDone', tasksDone);
    const tasksToday = await this.tasksService.getTasksBySprintIdToday(
      request.sprint_id,
    );
    console.log('tasksToday', tasksToday);

    // Fetch sprint owner user and their subscription plan
    const sprint = await this.sprintRepo.findOne({
      where: { sprint_id: request.sprint_id },
      relations: ['user', 'user.subscriptionPlan'],
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const user = sprint.user;
    const isFreePlan =
      user &&
      user.subscriptionPlan &&
      user.subscriptionPlan.subscription_plan_id === 1;

    const completedList =
      tasksDone.length > 0
        ? tasksDone.map((t) => `- ${t.title}`).join('\n')
        : '- No completed tasks found.';
    const todayList =
      tasksToday.length > 0
        ? tasksToday.map((t) => `- ${t.title}`).join('\n')
        : '- No tasks in progress planned for today.';

    // Rule: Gemini API is ONLY used for the Free Plan
    if (isFreePlan) {
      const openaiClient = this.getOpenAIClient();
      if (!openaiClient) {
        console.log('OpenAI API Key not set. Generating mock report for Free Plan.');
        const content = `### 🎯 Daily Progress Report (Mock Mode)

#### 📅 Date: ${parsedDate.toLocaleDateString()}

#### ✅ Completed Yesterday
${completedList}

#### ⚡ Planned for Today
${todayList}

*Note: This report was automatically generated in mock mode because the Gemini API Key is not configured.*`;

        return {
          role: 'assistant',
          content: content,
          refusal: null,
        } as ChatCompletionMessage;
      }

      const promptList = await this.promptService.getPrompt();
      const basePrompt =
        promptList && promptList.length > 0
          ? promptList[0].prompt
          : 'You are an AI assistant helping a software team with their daily updates. Please generate a daily progress report (in markdown format) summarizing what was achieved yesterday (tasks completed) and what is planned for today.';

      const promptFinal = `
      ${basePrompt}

      Tasks completed yesterday: ${tasksDone.map((task) => task.title).join(', ')}

      Tasks for today: ${tasksToday.map((task) => task.title).join(', ')}
      `;

      const apiKey = this.configService.apiOpenAi;
      const modelName =
        apiKey && apiKey.startsWith('AIzaSy') ? 'gemini-1.5-flash' : 'gpt-4o-mini';

      const completion = await openaiClient.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: promptFinal,
          },
        ],
        model: modelName,
      });

      return completion.choices[0].message;
    } else {
      // Non-free plan: generates mock report directly, bypassing Gemini API
      console.log('Daily report AI functions are restricted to the Free Plan. Generating mock report.');
      const content = `### 🎯 Daily Progress Report (Mock Mode)

#### 📅 Date: ${parsedDate.toLocaleDateString()}

#### ✅ Completed Yesterday
${completedList}

#### ⚡ Planned for Today
${todayList}

*Note: This report was automatically generated in mock mode because the daily report AI function is restricted to the Free Plan.*`;

      return {
        role: 'assistant',
        content: content,
        refusal: null,
      } as ChatCompletionMessage;
    }
  }
}
