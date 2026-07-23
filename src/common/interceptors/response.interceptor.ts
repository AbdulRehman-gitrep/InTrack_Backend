import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();

    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ||
      'Success';

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        statusCode: response.statusCode,
        message,
        data,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
      })),
    );
  }
}
