import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { RateLimitedException } from '../common/exceptions/rate-limited.exception';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { sanitizeMarkdown } from '../common/utils/markdown-sanitizer';
import OpenAI from 'openai';
import { ChatCompletionMessage } from 'openai/resources/chat/completions';
import config from '../config';
import { PromptService } from '../prompt/service/prompt.service';
import { TasksService } from '../tasks/services/tasks.service';
import { MoreThan, Repository } from 'typeorm';
import { Sprints } from '../sprints/entities/sprint.entity';
import { AiUsageLog } from './entities/ai-usage-log.entity';

export class OpenAIRequestDto {
  @IsNotEmpty()
  @IsNumber()
  sprint_id: number;

  @IsNotEmpty()
  @IsString()
  dateReport: string;
}

const FALLBACK_PROMPT =
  'You are an AI assistant helping a software team with their daily updates. Please generate a daily progress report (in markdown format) summarizing what was achieved yesterday (tasks completed) and what is planned for today.';

/**
 * Free-only policy for OpenRouter: only the free router alias or an
 * explicit `:free` model is ever called, so a paid model id can never
 * be charged by mistake.
 */
export const DEFAULT_FREE_OPENROUTER_MODEL = 'openrouter/free';

export function isFreeOpenRouterModel(model: string | undefined | null): boolean {
  if (!model) return false;
  const m = model.trim();
  return m === 'openrouter/free' || m.endsWith(':free');
}

@Injectable()
export class AiFunctionsService {
  private readonly logger = new Logger(AiFunctionsService.name);
  private openai: OpenAI | null = null;
  private openRouterClient: OpenAI | null = null;

  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(Sprints)
    private sprintRepo: Repository<Sprints>,
    private tasksService: TasksService,
    private promptService: PromptService,
    @Optional()
    @InjectRepository(AiUsageLog)
    private usageRepo?: Repository<AiUsageLog>,
  ) {}

  private isUsableKey(key?: string): key is string {
    return !!key && key !== 'mock' && key.trim() !== '';
  }

  /**
   * Resolve which provider to call.
   * - AI_PROVIDER=openrouter|openai|gemini|mock forces that provider.
   * - auto: OpenRouter key wins if present, else legacy API_OPEN_AI (Gemini if AIzaSy*, else OpenAI).
   * - OpenRouter is free-only: only 'openrouter/free' or ':free' models are used.
   * Returns null when no usable key -> caller falls back to mock report.
   */
  resolveAiClient():
    | { client: OpenAI; model: string; provider: 'openrouter' | 'gemini' | 'openai' }
    | null {
    const ai = (this.configService as any)?.ai;
    const configuredProvider: string = ai?.provider ?? 'auto';
    const apiOpenAi: string | undefined = this.configService?.apiOpenAi;
    const openRouterKey: string | undefined = ai?.openrouter?.apiKey;
    // Free-only: any non-free OPENROUTER_MODEL is replaced, never charged.
    let openRouterModel = DEFAULT_FREE_OPENROUTER_MODEL;
    if (isFreeOpenRouterModel(ai?.openrouter?.model)) {
      openRouterModel = (ai.openrouter.model as string).trim();
    } else if (ai?.openrouter?.model) {
      this.logger.warn(
        `OPENROUTER_MODEL "${ai.openrouter.model}" is not a free model — using "${DEFAULT_FREE_OPENROUTER_MODEL}" instead`,
      );
    }
    const openRouterBaseUrl: string =
      ai?.openrouter?.baseUrl ?? 'https://openrouter.ai/api/v1';
    const openRouterSiteUrl: string =
      ai?.openrouter?.siteUrl ?? 'http://localhost:4200';
    const openRouterAppTitle: string = ai?.openrouter?.appTitle ?? 'Focus Loop';

    const useOpenRouter = () => {
      if (!this.isUsableKey(openRouterKey)) return null;
      if (!this.openRouterClient) {
        this.openRouterClient = new OpenAI({
          apiKey: openRouterKey,
          baseURL: openRouterBaseUrl,
          defaultHeaders: {
            'HTTP-Referer': openRouterSiteUrl,
            'X-Title': openRouterAppTitle,
          },
        } as any);
      }
      return {
        client: this.openRouterClient,
        model: openRouterModel,
        provider: 'openrouter' as const,
      };
    };

    const useLegacy = () => {
      if (!this.isUsableKey(apiOpenAi)) return null;
      if (!this.openai) {
        const options: any = { apiKey: apiOpenAi };
        if (apiOpenAi.startsWith('AIzaSy')) {
          options.baseURL =
            'https://generativelanguage.googleapis.com/v1beta/openai/';
        }
        this.openai = new OpenAI(options);
      }
      const provider = apiOpenAi.startsWith('AIzaSy') ? 'gemini' : 'openai';
      const model =
        provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini';
      return { client: this.openai, model, provider: provider as 'gemini' | 'openai' };
    };

    switch (configuredProvider) {
      case 'openrouter':
        return useOpenRouter();
      case 'openai':
      case 'gemini':
        return useLegacy();
      case 'mock':
        return null;
      case 'auto':
      default:
        return useOpenRouter() ?? useLegacy();
    }
  }

  private getOpenAIClient(): OpenAI | null {
    return this.resolveAiClient()?.client ?? null;
  }

  private async enforceDailyLimit(userId: number) {
    const limit = this.configService?.ai?.dailyLimit ?? 10;
    if (!this.usageRepo) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await this.usageRepo.count({
      where: { user_id: userId, created_at: MoreThan(since) },
    });
    if (count >= limit) {
      throw new RateLimitedException(
        `Daily AI generation limit reached (${limit}/day). Try again tomorrow.`,
        { limit, window: '24h' },
      );
    }
  }

  private async recordUsage(userId: number, sprintId: number) {
    if (!this.usageRepo) return;
    await this.usageRepo.save(
      this.usageRepo.create({ user_id: userId, sprint_id: sprintId }),
    );
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  private buildMockReport(
    parsedDate: Date,
    completedList: string,
    todayList: string,
    why: string,
  ): ChatCompletionMessage {
    const content = sanitizeMarkdown(`### 🎯 Daily Progress Report (Mock Mode)

#### 📅 Date: ${parsedDate.toLocaleDateString()}

#### ✅ Completed Yesterday
${completedList}

#### ⚡ Planned for Today
${todayList}

*Note: ${why}*`);
    return {
      role: 'assistant',
      content,
      refusal: null,
    } as ChatCompletionMessage;
  }

  async chatCompletion(
    request: OpenAIRequestDto,
    requesterUserId?: number,
  ): Promise<ChatCompletionMessage> {
    const parsedDate = new Date(request.dateReport);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'dateReport must be a valid date',
      });
    }

    const sprint = await this.sprintRepo.findOne({
      where: { sprint_id: request.sprint_id },
      relations: ['user', 'user.subscriptionPlan'],
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const sprintOwnerId = (sprint as any).user?.user_id;
    const userId = requesterUserId ?? sprintOwnerId;

    // Owner check: token user must own the sprint (when requester is known).
    if (
      requesterUserId !== undefined &&
      sprintOwnerId !== undefined &&
      sprintOwnerId !== requesterUserId
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not the sprint owner',
      });
    }
    if (!userId) {
      throw new NotFoundException('Sprint owner not found');
    }

    await this.enforceDailyLimit(userId);
    await this.recordUsage(userId, request.sprint_id);

    const tasksDone = await this.tasksService.getTasksBySprintIdPreviousDay(
      request.sprint_id,
      parsedDate,
    );
    const tasksToday = await this.tasksService.getTasksBySprintIdToday(
      request.sprint_id,
    );

    const maxPromptChars = this.configService?.ai?.maxPromptChars ?? 8000;
    const maxContentChars = this.configService?.ai?.maxContentChars ?? 8000;

    const completedList =
      tasksDone.length > 0
        ? tasksDone
            .slice(0, 50)
            .map((t) => `- ${t.title}`)
            .join('\n')
        : '- No completed tasks found.';
    const todayList =
      tasksToday.length > 0
        ? tasksToday
            .slice(0, 50)
            .map((t) => `- ${t.title}`)
            .join('\n')
        : '- No tasks in progress planned for today.';

    // All plans can use the real LLM (free-only model policy above).

    const resolved = this.resolveAiClient();
    if (!resolved) {
      const wantsOpenRouter =
        (this.configService as any)?.ai?.provider === 'openrouter';
      return this.buildMockReport(
        parsedDate,
        completedList,
        todayList,
        wantsOpenRouter
          ? 'This report was automatically generated in mock mode because the OpenRouter API Key is not configured.'
          : 'This report was automatically generated in mock mode because the Gemini API Key is not configured.',
      );
    }
    const openaiClient = resolved.client;

    const promptList = await this.promptService.getPrompt();
    const basePrompt =
      promptList && promptList.length > 0
        ? promptList[0].prompt
        : FALLBACK_PROMPT;

    let promptFinal = `${basePrompt}

Tasks completed yesterday: ${tasksDone.map((t) => t.title).join(', ')}

Tasks for today: ${tasksToday.map((t) => t.title).join(', ')}`;

    if (promptFinal.length > maxPromptChars) {
      promptFinal = promptFinal.slice(0, maxPromptChars);
    }

    const modelName = resolved.model;
    const maxTokens = this.configService?.ai?.maxTokens ?? 800;
    const timeoutMs = this.configService?.ai?.timeoutMs ?? 15_000;

    try {
      const completion = await this.withTimeout(
        openaiClient.chat.completions.create({
          messages: [{ role: 'user', content: promptFinal }],
          model: modelName,
          max_tokens: maxTokens,
        }),
        timeoutMs,
      );

      const message = completion.choices[0]?.message;
      if (!message) {
        return {
          role: 'assistant',
          content: null,
          refusal: 'AI returned an empty response',
        } as ChatCompletionMessage;
      }

      // Propagate explicit LLM refusal.
      if ((message as any).refusal) {
        return {
          role: 'assistant',
          content: null,
          refusal: String((message as any).refusal),
        } as ChatCompletionMessage;
      }

      const rawContent = message.content ?? '';
      let sanitized = sanitizeMarkdown(rawContent);
      if (sanitized.length > maxContentChars) {
        sanitized = sanitized.slice(0, maxContentChars);
      }
      return {
        role: 'assistant',
        content: sanitized,
        refusal: null,
      } as ChatCompletionMessage;
    } catch (err: any) {
      if (err?.message === 'AI_TIMEOUT') {
        this.logger.warn('AI generation timed out');
        return {
          role: 'assistant',
          content: null,
          refusal: 'AI request timed out, please try again',
        } as ChatCompletionMessage;
      }
      this.logger.error('AI generation failed', err);
      return {
        role: 'assistant',
        content: null,
        refusal: 'AI generation failed, please try again',
      } as ChatCompletionMessage;
    }
  }
}
