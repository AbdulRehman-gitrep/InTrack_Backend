import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { FindAllTasksDto } from './dto/find-all-tasks.dto';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ResponseMessage('Task created successfully')
  async create(@Body() dto: CreateTaskDto, @Req() req: AuthenticatedRequest) {
    return this.taskService.create(dto, req.user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.INTERN, Role.BUDDY)
  @ResponseMessage('Tasks retrieved successfully')
  async findAll(
    @Query() query: FindAllTasksDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.taskService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.INTERN, Role.BUDDY)
  @ResponseMessage('Task retrieved successfully')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.taskService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ResponseMessage('Task updated successfully')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.taskService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @Roles(Role.INTERN)
  @ResponseMessage('Status updated successfully')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.taskService.updateStatus(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ResponseMessage('Task deleted successfully')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.taskService.remove(id, req.user);
  }
}
