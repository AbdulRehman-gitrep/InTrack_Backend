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
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @Roles(Role.INTERN)
  @UseInterceptors(FilesInterceptor('files', 5, { storage: memoryStorage() }))
  @ResponseMessage('Report submitted successfully')
  async create(
    @Body() dto: CreateReportDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportService.create(dto, files ?? [], req.user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.INTERN, Role.BUDDY)
  @ResponseMessage('Reports retrieved successfully')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    return this.reportService.findAll(req!.user, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.INTERN, Role.BUDDY)
  @ResponseMessage('Report retrieved successfully')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.INTERN)
  @UseInterceptors(FilesInterceptor('files', 5, { storage: memoryStorage() }))
  @ResponseMessage('Report updated successfully')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportService.update(id, dto, files ?? [], req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.INTERN)
  @ResponseMessage('Report deleted successfully')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportService.remove(id, req.user);
  }

  @Patch(':id/review')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ResponseMessage('Report marked as reviewed')
  async markReviewed(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportService.markReviewed(id, req.user);
  }

  @Delete(':id/attachments/:publicId')
  @Roles(Role.INTERN)
  @ResponseMessage('Attachment deleted successfully')
  async deleteAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('publicId') publicId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reportService.deleteAttachment(publicId, id, req.user);
  }
}
