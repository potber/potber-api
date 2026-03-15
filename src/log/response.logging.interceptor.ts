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
      tap(() => {
        const dateOut = new Date();

        Logger.verbose(
          {
            duration_ms: dateOut.getTime() - dateIn.getTime(),
            message: 'Request fulfilled.',
            method: req.method,
            status_code: res.statusCode,
            url: req.originalUrl,
          },
          'Response',
        );
      }),
    );
  }
}
