import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('User created successfully')
  async create(@Body() dto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    return this.userService.create(dto, req.user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BUDDY, Role.INTERN)
  @ResponseMessage('Users retrieved successfully')
  async findAll(
    @Query() query: FindAllUsersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BUDDY, Role.INTERN)
  @ResponseMessage('User retrieved successfully')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.findOne(id, req.user);
  }

  @Patch('me/profile')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BUDDY, Role.INTERN)
  @ResponseMessage('Profile updated successfully')
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.updateProfile(req.user, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('User updated successfully')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ResponseMessage('User status updated successfully')
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.changeStatus(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('User deleted successfully')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.remove(id, req.user);
  }
}
