import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';
import { ReportAttachment } from '../entities/report-attachment.entity';
import { User } from '../entities/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ActivityService } from '../activity/activity.service';
import { ReportStatus } from '../common/enums/report-status.enum';
import { Role } from '../common/enums/role.enum';
import { ActionType } from '../common/enums/action-type.enum';
import { EntityType } from '../common/enums/entity-type.enum';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
] as const;

const FILE_SIZE_LIMITS: Record<string, number> = {
  'image/jpeg': 5 * 1024 * 1024,
  'image/png': 5 * 1024 * 1024,
  'image/webp': 5 * 1024 * 1024,
  'application/pdf': 10 * 1024 * 1024,
  'video/mp4': 50 * 1024 * 1024,
};

const MAX_ATTACHMENTS = 5;

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ReportAttachment)
    private readonly attachmentRepository: Repository<ReportAttachment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly activityService: ActivityService,
  ) {}

  async create(
    dto: CreateReportDto,
    files: Express.Multer.File[],
    user: JwtPayload,
  ) {
    const intern = await this.userRepository.findOne({
      where: { id: user.id },
    });
    if (!intern) {
      throw new NotFoundException('User not found');
    }

    this.validateFiles(files);

    const report = this.reportRepository.create({
      title: dto.title,
      description: dto.description,
      intern,
      status: ReportStatus.PENDING,
    });

    const savedReport = await this.reportRepository.save(report);

    let attachments: ReportAttachment[] = [];
    if (files.length > 0) {
      const uploaded = await this.cloudinaryService.uploadFiles(files);
      attachments = uploaded.map((file, index) =>
        this.attachmentRepository.create({
          report: savedReport,
          fileName: files[index].originalname,
          fileType: files[index].mimetype,
          fileUrl: file.secure_url,
          publicId: file.public_id,
        }),
      );
      await this.attachmentRepository.save(attachments);
    }

    await this.activityService.logActivity({
      userId: user.id,
      actionType: ActionType.CREATE_REPORT,
      entityType: EntityType.REPORT,
      entityId: savedReport.id,
      description: `Report "${savedReport.title}" submitted by ${user.email}`,
    });

    this.logger.log(
      `Report created: ${savedReport.title} (id=${savedReport.id})`,
    );

    return this.formatReport(savedReport, attachments);
  }

  async findAll(
    user: JwtPayload,
    query: { page?: number; limit?: number; search?: string; status?: string },
  ) {
    const { page = 1, limit = 10, search, status } = query;
    const currentRole = user.role.toUpperCase() as Role;

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.attachments', 'attachments')
      .leftJoinAndSelect('report.intern', 'intern');

    if (currentRole === Role.INTERN) {
      qb.andWhere('report.internId = :userId', { userId: user.id });
    } else if (currentRole === Role.MANAGER) {
      qb.andWhere(
        'report.internId IN (SELECT ii."internId" FROM intern_info ii WHERE ii."managerId" = :userId)',
        { userId: user.id },
      );
    } else if (currentRole === Role.BUDDY) {
      qb.andWhere(
        'report.internId IN (SELECT ii."internId" FROM intern_info ii WHERE ii."buddyId" = :userId)',
        { userId: user.id },
      );
    }

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(report.title ILIKE :search OR report.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [reports, total] = await qb.getManyAndCount();

    return {
      reports: reports.map((r) => this.formatReport(r, r.attachments)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, user: JwtPayload) {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: { intern: true, attachments: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    this.validateAccess(report, user);

    return this.formatReport(report, report.attachments);
  }

  async update(
    id: number,
    dto: UpdateReportDto,
    files: Express.Multer.File[],
    user: JwtPayload,
  ) {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: { intern: true, attachments: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.intern.id !== user.id) {
      throw new ForbiddenException('You can only edit your own reports');
    }

    if (dto.title !== undefined) report.title = dto.title;
    if (dto.description !== undefined) report.description = dto.description;

    if (files.length > 0) {
      this.validateFiles(files);

      const totalAttachments = report.attachments.length + files.length;
      if (totalAttachments > MAX_ATTACHMENTS) {
        throw new BadRequestException(
          `Maximum ${MAX_ATTACHMENTS} attachments allowed. You can add ${MAX_ATTACHMENTS - report.attachments.length} more.`,
        );
      }

      const uploaded = await this.cloudinaryService.uploadFiles(files);
      const newAttachments = uploaded.map((file, index) =>
        this.attachmentRepository.create({
          report,
          fileName: files[index].originalname,
          fileType: files[index].mimetype,
          fileUrl: file.secure_url,
          publicId: file.public_id,
        }),
      );
      await this.attachmentRepository.save(newAttachments);
      report.attachments = [...report.attachments, ...newAttachments];
    }

    const savedReport = await this.reportRepository.save(report);

    await this.activityService.logActivity({
      userId: user.id,
      actionType: ActionType.UPDATE_REPORT,
      entityType: EntityType.REPORT,
      entityId: savedReport.id,
      description: `Report "${savedReport.title}" updated by ${user.email}`,
    });

    this.logger.log(
      `Report updated: ${savedReport.title} (id=${savedReport.id})`,
    );

    const fullReport = await this.reportRepository.findOne({
      where: { id: savedReport.id },
      relations: { attachments: true },
    });

    return this.formatReport(fullReport!, fullReport!.attachments);
  }

  async remove(id: number, user: JwtPayload) {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: { intern: true, attachments: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const currentRole = user.role.toUpperCase() as Role;
    if (currentRole === Role.INTERN && report.intern.id !== user.id) {
      throw new ForbiddenException('You can only delete your own reports');
    }

    for (const attachment of report.attachments) {
      await this.cloudinaryService.deleteFile(attachment.publicId);
    }

    await this.attachmentRepository.remove(report.attachments);
    await this.reportRepository.remove(report);

    await this.activityService.logActivity({
      userId: user.id,
      actionType: ActionType.DELETE_REPORT,
      entityType: EntityType.REPORT,
      entityId: id,
      description: `Report "${report.title}" deleted by ${user.email}`,
    });

    this.logger.log(`Report deleted: ${report.title} (id=${id})`);

    return { id };
  }

  async markReviewed(id: number, user: JwtPayload) {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: { intern: true, attachments: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status === ReportStatus.REVIEWED) {
      throw new BadRequestException('Report is already reviewed');
    }

    report.status = ReportStatus.REVIEWED;
    const savedReport = await this.reportRepository.save(report);

    await this.activityService.logActivity({
      userId: user.id,
      actionType: ActionType.UPDATE_REPORT,
      entityType: EntityType.REPORT,
      entityId: savedReport.id,
      description: `Report "${savedReport.title}" marked as reviewed by ${user.email}`,
    });

    return this.formatReport(savedReport, savedReport.attachments);
  }

  async deleteAttachment(publicId: string, reportId: number, user: JwtPayload) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: { intern: true, attachments: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.intern.id !== user.id) {
      throw new ForbiddenException('You can only edit your own reports');
    }

    const attachment = report.attachments.find((a) => a.publicId === publicId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.cloudinaryService.deleteFile(publicId);
    await this.attachmentRepository.remove(attachment);

    return { id: attachment.id, publicId };
  }

  private validateFiles(files: Express.Multer.File[]) {
    if (files.length > MAX_ATTACHMENTS) {
      throw new BadRequestException(`Maximum ${MAX_ATTACHMENTS} files allowed`);
    }

    for (const file of files) {
      if (
        !ALLOWED_MIME_TYPES.includes(
          file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
        )
      ) {
        throw new BadRequestException(
          `File type "${file.mimetype}" is not supported`,
        );
      }

      const limit = FILE_SIZE_LIMITS[file.mimetype];
      if (limit && file.size > limit) {
        throw new BadRequestException(
          `File "${file.originalname}" exceeds the size limit`,
        );
      }
    }
  }

  private validateAccess(report: Report, user: JwtPayload) {
    const currentRole = user.role.toUpperCase() as Role;

    if (currentRole === Role.INTERN && report.intern.id !== user.id) {
      throw new ForbiddenException('You can only view your own reports');
    }
  }

  private formatReport(report: Report, attachments: ReportAttachment[]) {
    return {
      id: report.id,
      title: report.title,
      description: report.description,
      status: report.status,
      internId: report.intern?.id ?? null,
      internName: report.intern?.fullName ?? null,
      attachments: attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileType: a.fileType,
        fileUrl: a.fileUrl,
        publicId: a.publicId,
        createdAt: a.createdAt,
      })),
      createdAt: report.createdAt,
    };
  }
}
