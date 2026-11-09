import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RateLimitedException } from '../exceptions/rate-limited.exception';

interface Bucket {
  count: number;
  resetsAt: number;
}

/**
 * In-memory fixed-window rate limiter (no Redis dep).
 * Per-instance only — acceptable for single-instance / Vercel functions,
 * but swap for Redis in multi-instance prod.
 * Limits by JSON path group so dev health checks never trip.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  private readonly WINDOW_MS = 60_000;
  private readonly limits: Array<{
    test: (path: string, method: string) => boolean;
    limit: number;
  }> = [
    { test: (p) => p === '/auth/login', limit: 10 },
    { test: (p) => p === '/auth/refresh', limit: 20 },
    { test: (p, m) => p === '/users' && m === 'POST', limit: 5 },
    { test: (p) => p.startsWith('/ai-functions'), limit: 30 },
    { test: () => true, limit: 120 },
  ];

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const path = (req.path ?? req.url ?? '').split('?')[0];
    const method = (req.method ?? 'GET').toUpperCase();

    if (path === '/healthz' || path === '/') return true;
    if (method === 'OPTIONS') return true;

    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.ip ??
      'unknown';

    const rule =
      this.limits.find((l) => l.test(path, method)) ??
      this.limits[this.limits.length - 1];
    const key = `${ip}:${rule === this.limits[0] ? 'login' : (path.split('/')[1] ?? 'api')}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetsAt) {
      this.buckets.set(key, { count: 1, resetsAt: now + this.WINDOW_MS });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > rule.limit) {
      const retryAfter = Math.ceil((bucket.resetsAt - now) / 1000);
      throw new RateLimitedException('Too many requests. Please slow down.', {
        retryAfterSeconds: retryAfter,
        limit: rule.limit,
        windowMs: this.WINDOW_MS,
      });
    }
    return true;
  }
}
