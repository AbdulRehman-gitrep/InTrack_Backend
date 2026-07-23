import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { Reflector } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api');

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      );
    });
    next();
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/api`);
}
void bootstrap();
