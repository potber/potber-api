import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric('http_requests_total') public counter: Counter<string>,
  ) {}

  use(req: Request, _res: Response, next: NextFunction) {
    if (
      !req.originalUrl.startsWith('/metrics') &&
      !req.originalUrl.startsWith('/healthz')
    ) {
      this.counter.inc();

      Logger.verbose(
        {
          message: 'Incoming request.',
          method: req.method,
          origin: req.header('origin'),
          url: req.originalUrl,
        },
        'Request',
      );
    }
    next();
  }
}
