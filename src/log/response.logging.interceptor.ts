import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ResponseLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: Request = context.getArgByIndex(0);
    const res: Response = context.getArgByIndex(1);

    if (
      req.originalUrl.startsWith('/metrics') ||
      req.originalUrl.startsWith('/healthz')
    ) {
      return next.handle();
    }

    const dateIn = new Date();

    return next.handle().pipe(
      tap({
        next: () => {
          const dateOut = new Date();

          Logger.verbose(
            {
              duration_ms: dateOut.getTime() - dateIn.getTime(),
              message: 'Request fulfilled.',
              method: req.method,
              path: req.path,
              status_code: res.statusCode,
            },
            'Response',
          );
        },
        error: (error: unknown) => {
          const statusCode =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof error.status === 'number'
              ? error.status
              : 500;

          Logger.error(
            {
              duration_ms: new Date().getTime() - dateIn.getTime(),
              error,
              message: 'Request failed.',
              method: req.method,
              path: req.path,
              status_code: statusCode,
            },
            undefined,
            'Response',
          );
        },
      }),
    );
  }
}
