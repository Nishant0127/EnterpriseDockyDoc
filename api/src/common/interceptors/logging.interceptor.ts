import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

/**
 * Global logging interceptor.
 * Logs method, path, and response time for every request.
 *
 * Output:
 *   GET /api/v1/health → 200 [12ms]
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const status = context.switchToHttp().getResponse<{ statusCode: number }>().statusCode;
        this.logger.log(`${method} ${url} → ${status} [${ms}ms]`);
      }),
    );
  }
}
