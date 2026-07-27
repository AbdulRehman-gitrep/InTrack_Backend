import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ResponseMessage('Activities retrieved successfully')
  async findAll(
    @Query() filter: ActivityFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.activityService.findAll(filter, req.user);
  }

  @Get(':id')
  @ResponseMessage('Activity retrieved successfully')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.activityService.findOne(id, req.user);
  }
}
