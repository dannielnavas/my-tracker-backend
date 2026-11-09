import { ForbiddenException } from '@nestjs/common';

/**
 * 403 with envelope { code: 'PLAN_LIMITED', message, details, limitType, limitValue }
 * limitType: 'sprints' | 'tasks' (matches endpoint)
 * limitValue: max allowed (2 sprints, 30 tasks)
 */
export class PlanLimitedException extends ForbiddenException {
  readonly limitType: string;
  readonly limitValue: number;

  constructor(limitType: string, limitValue: number, message?: string) {
    const msg =
      message ??
      `Limit of ${limitValue} ${limitType} reached for Free plan. Please upgrade your subscription.`;
    super({
      code: 'PLAN_LIMITED',
      message: msg,
      details: { limitType, limitValue },
      limitType,
      limitValue,
    });
    this.limitType = limitType;
    this.limitValue = limitValue;
  }
}
