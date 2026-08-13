import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { SessionResource } from 'src/auth/resources/session.resource';

interface AuthenticatedRequest extends Request {
  user: SessionResource;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

type RequestKind = 'read' | 'write';

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_READ_LIMIT = 120;
const DEFAULT_WRITE_LIMIT = 30;
const DEFAULT_IP_READ_LIMIT = 2_400;
const DEFAULT_IP_WRITE_LIMIT = 600;

@Injectable()
export class UserConfigurationRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly windowMs: number;
  private readonly readLimit: number;
  private readonly writeLimit: number;
  private readonly ipReadLimit: number;
  private readonly ipWriteLimit: number;
  private nextPruneAt = 0;

  constructor(config: ConfigService) {
    this.windowMs = positiveInteger(
      config.get('USER_CONFIG_RATE_LIMIT_WINDOW_MS'),
      DEFAULT_WINDOW_MS,
    );
    this.readLimit = positiveInteger(
      config.get('USER_CONFIG_RATE_LIMIT_READ_MAX'),
      DEFAULT_READ_LIMIT,
    );
    this.writeLimit = positiveInteger(
      config.get('USER_CONFIG_RATE_LIMIT_WRITE_MAX'),
      DEFAULT_WRITE_LIMIT,
    );
    this.ipReadLimit = positiveInteger(
      config.get('USER_CONFIG_RATE_LIMIT_IP_READ_MAX'),
      DEFAULT_IP_READ_LIMIT,
    );
    this.ipWriteLimit = positiveInteger(
      config.get('USER_CONFIG_RATE_LIMIT_IP_WRITE_MAX'),
      DEFAULT_IP_WRITE_LIMIT,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const now = Date.now();
    this.pruneExpiredBuckets(now);
    const kind: RequestKind = request.method === 'GET' ? 'read' : 'write';
    const userRetryAfter = this.consume(
      `${kind}:user:${userId}`,
      kind === 'read' ? this.readLimit : this.writeLimit,
      now,
    );
    const ipRetryAfter = this.consume(
      `${kind}:ip:${request.ip || request.socket.remoteAddress || 'unknown'}`,
      kind === 'read' ? this.ipReadLimit : this.ipWriteLimit,
      now,
    );
    const retryAfterMs = Math.max(userRetryAfter, ipRetryAfter);
    if (retryAfterMs > 0) {
      response.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000));
      throw new HttpException(
        'User configuration rate limit exceeded.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private consume(key: string, limit: number, now: number): number {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return 0;
    }
    if (bucket.count >= limit) {
      return bucket.resetAt - now;
    }
    bucket.count += 1;
    return 0;
  }

  private pruneExpiredBuckets(now: number) {
    if (now < this.nextPruneAt) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    this.nextPruneAt = now + this.windowMs;
  }
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
