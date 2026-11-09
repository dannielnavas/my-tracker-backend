import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

export interface ErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
  limitType?: string;
  limitValue?: number;
  statusCode: number;
}

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

/**
 * Global filter: every error body is { code, message, details?, statusCode }
 * plus limitType/limitValue for PLAN_LIMITED. Status preserved (401 keeps frontend session-clear behaviour).
 * PlanLimitedException already returns a shaped object; pass it through.
 */
@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorEnvelopeFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown = undefined;
    const extra: Partial<ErrorEnvelope> = {};

    if (exception instanceof QueryFailedError) {
      const pgCode = (exception as any).code ?? exception.driverError?.code;
      if (pgCode === '23505') {
        status = HttpStatus.CONFLICT;
        code = 'CONFLICT';
        message = 'Resource already exists (unique constraint violation)';
        details = { pgCode };
      } else {
        this.logger.error('QueryFailedError', exception as Error);
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      // Already enveloped (PlanLimited / custom): { code, message, ... }
      if (
        typeof body === 'object' &&
        body !== null &&
        'code' in (body as Record<string, unknown>)
      ) {
        const b = body as Record<string, unknown>;
        code = String(b.code ?? CODE_BY_STATUS[status] ?? 'ERROR');
        message = String(b.message ?? exception.message ?? 'Error');
        if (b.details !== undefined) details = b.details;
        if (b.limitType !== undefined) extra.limitType = String(b.limitType);
        if (b.limitValue !== undefined) extra.limitValue = Number(b.limitValue);
      } else if (typeof body === 'object' && body !== null) {
        // Nest default: { message, statusCode, error }
        const b = body as Record<string, unknown>;
        code =
          status === HttpStatus.BAD_REQUEST && Array.isArray(b.message)
            ? 'VALIDATION_ERROR'
            : (CODE_BY_STATUS[status] ?? 'ERROR');
        message = Array.isArray(b.message)
          ? (b.message as unknown[]).map(String).join('; ')
          : String(b.message ?? exception.message ?? 'Error');
        if (Array.isArray(b.message)) details = b.message;
      } else {
        code = CODE_BY_STATUS[status] ?? 'ERROR';
        message = String(body ?? exception.message ?? 'Error');
      }
    } else {
      this.logger.error('Unhandled exception', exception as Error);
    }

    if (status >= 500) {
      // Avoid leaking internals
      if (code === 'INTERNAL_ERROR') message = 'Internal server error';
    }

    const payload: ErrorEnvelope = {
      code,
      message,
      statusCode: status,
      ...extra,
    };
    if (details !== undefined) payload.details = details;

    response.status(status).json(payload);
  }
}
