import { HttpException, HttpStatus } from '@nestjs/common';

export class RateLimitedException extends HttpException {
  constructor(message: string, details?: unknown) {
    super(
      { code: 'RATE_LIMITED', message, details },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
