import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/task.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ActivityModule } from './activity/activity.module';
import { ReportsModule } from './reports/report.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { databaseConfig } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { RATE_LIMIT } from './common/constants/app.constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([RATE_LIMIT.GLOBAL]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TasksModule,
    FeedbackModule,
    ActivityModule,
    CloudinaryModule,
    ReportsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
