import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CredentialsService } from '../common/services/credentials.service';

@Module({
  controllers: [UserController],
  providers: [UserService, CredentialsService],
})
export class UsersModule {}
