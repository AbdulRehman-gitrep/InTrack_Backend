import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(Role.ADMIN)
  @ResponseMessage('Admin dashboard data retrieved successfully')
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('manager')
  @Roles(Role.MANAGER)
  @ResponseMessage('Manager dashboard data retrieved successfully')
  async getManagerDashboard(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getManagerDashboard(req.user.id);
  }

  @Get('buddy')
  @Roles(Role.BUDDY)
  @ResponseMessage('Buddy dashboard data retrieved successfully')
  async getBuddyDashboard(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getBuddyDashboard(req.user.id);
  }

  @Get('intern')
  @Roles(Role.INTERN)
  @ResponseMessage('Intern dashboard data retrieved successfully')
  async getInternDashboard(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getInternDashboard(req.user.id);
  }
}
