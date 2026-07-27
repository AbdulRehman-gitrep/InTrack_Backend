import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Roles(Role.MANAGER, Role.BUDDY)
  @ResponseMessage('Feedback sent successfully')
  async create(
    @Body() dto: CreateFeedbackDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.feedbackService.create(dto, req.user);
  }

  @Get('received')
  @Roles(Role.INTERN)
  @ResponseMessage('Feedback retrieved successfully')
  async findReceived(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.findByReceiver(
      req.user.id,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get('sent')
  @Roles(Role.MANAGER, Role.BUDDY)
  @ResponseMessage('Feedback retrieved successfully')
  async findSent(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.findBySender(
      req.user.id,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }
}
