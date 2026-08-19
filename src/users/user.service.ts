import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { InternInfo } from '../entities/intern-info.entity';
import { ActivityService } from '../activity/activity.service';
import { UserStatus } from '../common/enums/user-status.enum';
import { Role } from '../common/enums/role.enum';
import { ActionType } from '../common/enums/action-type.enum';
import { EntityType } from '../common/enums/entity-type.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(InternInfo)
    private readonly internInfoRepository: Repository<InternInfo>,
    private readonly activityService: ActivityService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateUserDto, actor: JwtPayload) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      this.logger.warn(
        `Attempt to create user with duplicate email: ${dto.email}`,
      );
      throw new ConflictException('Email already exists');
    }

    let manager: User | null = null;
    let buddy: User | null = null;
    if (dto.role === Role.INTERN) {
      this.validateInternshipDates(dto.internshipStart, dto.internshipEnd);
      manager = await this.findRelationshipUser(
        dto.managerId,
        Role.MANAGER,
        'Manager',
      );
      buddy = await this.findRelationshipUser(dto.buddyId, Role.BUDDY, 'Buddy');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const saved = await this.userRepository.manager.transaction(
      async (entityManager) => {
        const userRepository = entityManager.getRepository(User);
        const user = userRepository.create({
          fullName: dto.fullName,
          email: dto.email,
          password: hashedPassword,
          role: dto.role,
          department: dto.department,
        });
        const savedUser = await userRepository.save(user);

        if (dto.role === Role.INTERN) {
          const internInfoRepository = entityManager.getRepository(InternInfo);
          const internInfo = internInfoRepository.create({
            intern: savedUser,
            ...(dto.internshipStart && {
              internshipStartDate: dto.internshipStart,
            }),
            ...(dto.internshipEnd && {
              internshipEndDate: dto.internshipEnd,
            }),
            manager,
            buddy,
          });
          await internInfoRepository.save(internInfo);
        }

        return savedUser;
      },
    );

    this.logger.log(`User created: ${saved.email} (${saved.role})`);

    await this.activityService.logActivity({
      userId: actor.id,
      actionType: ActionType.CREATE_USER,
      entityType: EntityType.USER,
      entityId: saved.id,
      description: `User "${saved.fullName}" created as ${saved.role} by ${actor.email}`,
    });

    const userWithRelations = await this.userRepository.findOne({
      where: { id: saved.id },
      relations: { internInfo: { manager: true, buddy: true } },
    });

    return this.formatUser(userWithRelations!);
  }

  async findAll(query: FindAllUsersDto, requestUser: JwtPayload) {
    const currentRole = requestUser.role.toUpperCase() as Role;
    if (currentRole === Role.INTERN) {
      const user = await this.findOneForResponse(requestUser.id);
      return {
        users: [user],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
      };
    }

    const { page = 1, limit, department, status, search } = query;
    let { role, managerId, buddyId } = query;
    if (currentRole === Role.MANAGER) {
      role = Role.INTERN;
      managerId = requestUser.id;
      buddyId = undefined;
    } else if (currentRole === Role.BUDDY) {
      role = Role.INTERN;
      buddyId = requestUser.id;
      managerId = undefined;
    }

    const baseWhere: Record<string, unknown> = {};
    if (role) baseWhere.role = role;
    if (department) baseWhere.department = department;
    if (status) baseWhere.status = status;
    if (managerId || buddyId) {
      baseWhere.internInfo = {
        ...(managerId ? { manager: { id: managerId } } : {}),
        ...(buddyId ? { buddy: { id: buddyId } } : {}),
      };
    }

    let where: FindOptionsWhere<User> | FindOptionsWhere<User>[];

    if (search) {
      where = [
        { ...baseWhere, fullName: ILike(`%${search}%`) },
        { ...baseWhere, email: ILike(`%${search}%`) },
      ];
    } else {
      where = baseWhere;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      relations: { internInfo: { manager: true, buddy: true } },
      ...(limit ? { skip: (page - 1) * limit, take: limit } : {}),
      order: { createdAt: 'DESC' },
    });

    const effectiveLimit = limit ?? total;

    return {
      users: users.map((u) => this.formatUser(u)),
      pagination: {
        page,
        limit: effectiveLimit,
        total,
        totalPages: effectiveLimit ? Math.ceil(total / effectiveLimit) : 1,
      },
    };
  }

  async findOne(id: number, requestUser: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { internInfo: { manager: true, buddy: true } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.validateUserAccess(user, requestUser);

    return this.formatUser(user);
  }

  async update(id: number, dto: UpdateUserDto, actor: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { internInfo: { manager: true, buddy: true } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existing) {
        this.logger.warn(
          `Attempt to update user email to duplicate: ${dto.email}`,
        );
        throw new ConflictException('Email already exists');
      }
    }

    const previousRole = user.role;
    const nextRole = dto.role ?? user.role;
    let managerUpdate: User | null | undefined;
    let buddyUpdate: User | null | undefined;
    if (nextRole === Role.INTERN) {
      this.validateInternshipDates(dto.internshipStart, dto.internshipEnd);
      if (dto.managerId !== undefined) {
        managerUpdate = await this.findRelationshipUser(
          dto.managerId,
          Role.MANAGER,
          'Manager',
        );
      }
      if (dto.buddyId !== undefined) {
        buddyUpdate = await this.findRelationshipUser(
          dto.buddyId,
          Role.BUDDY,
          'Buddy',
        );
      }
    } else if (
      dto.managerId !== undefined ||
      dto.buddyId !== undefined ||
      dto.internshipStart !== undefined ||
      dto.internshipEnd !== undefined
    ) {
      throw new BadRequestException(
        'Internship fields can only be set for interns',
      );
    }

    const hashedPassword = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : undefined;

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    if (hashedPassword !== undefined) user.password = hashedPassword;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.department !== undefined) user.department = dto.department;
    const saved = await this.userRepository.manager.transaction(
      async (entityManager) => {
        const savedUser = await entityManager.getRepository(User).save(user);
        const internInfoRepository = entityManager.getRepository(InternInfo);

        if (user.role === Role.INTERN) {
          const internInfo =
            user.internInfo ??
            internInfoRepository.create({ intern: savedUser });
          if (dto.internshipStart !== undefined) {
            internInfo.internshipStartDate = new Date(dto.internshipStart);
          }
          if (dto.internshipEnd !== undefined) {
            internInfo.internshipEndDate = new Date(dto.internshipEnd);
          }
          if (managerUpdate !== undefined) {
            internInfo.manager = managerUpdate;
          }
          if (buddyUpdate !== undefined) {
            internInfo.buddy = buddyUpdate;
          }
          await internInfoRepository.save(internInfo);
        } else if (previousRole === Role.INTERN && user.internInfo) {
          await internInfoRepository.remove(user.internInfo);
        }

        return savedUser;
      },
    );

    this.logger.log(`User updated: ${saved.email}`);

    await this.activityService.logActivity({
      userId: actor.id,
      actionType: ActionType.UPDATE_USER,
      entityType: EntityType.USER,
      entityId: saved.id,
      description: `User "${saved.fullName}" updated by ${actor.email}`,
    });

    const updated = await this.userRepository.findOne({
      where: { id },
      relations: { internInfo: { manager: true, buddy: true } },
    });

    return this.formatUser(updated!);
  }

  async changeStatus(id: number, dto: UpdateUserStatusDto, actor: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { internInfo: { manager: true, buddy: true } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = dto.status;
    const saved = await this.userRepository.save(user);

    this.logger.log(`User status changed: ${saved.email} -> ${saved.status}`);

    await this.activityService.logActivity({
      userId: actor.id,
      actionType: ActionType.CHANGE_USER_STATUS,
      entityType: EntityType.USER,
      entityId: saved.id,
      description: `User "${saved.fullName}" status changed to ${saved.status} by ${actor.email}`,
    });

    return this.formatUser(saved);
  }

  async updateProfile(actor: JwtPayload, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: actor.id },
      relations: { internInfo: { manager: true, buddy: true } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.department !== undefined) user.department = dto.department;
    if (dto.password !== undefined) {
      user.password = await bcrypt.hash(dto.password, 12);
    }

    const saved = await this.userRepository.save(user);
    await this.activityService.logActivity({
      userId: actor.id,
      actionType: ActionType.UPDATE_USER,
      entityType: EntityType.USER,
      entityId: actor.id,
      description: `User "${saved.fullName}" updated their profile`,
    });

    return this.formatUser(saved);
  }

  async remove(id: number, user: JwtPayload) {
    if (id === user.id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const target = await this.userRepository.findOne({
      where: { id },
      relations: { internInfo: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const attachments = await this.userRepository.manager.query<
      { publicId: string }[]
    >(
      'SELECT "publicId" FROM report_attachments WHERE "reportId" IN (SELECT id FROM reports WHERE "internId" = $1)',
      [id],
    );

    await this.userRepository.manager.transaction(async (manager) => {
      await manager.query('DELETE FROM activity WHERE "userId" = $1', [id]);
      await manager.query(
        'DELETE FROM feedback WHERE "fromId" = $1 OR "toId" = $1',
        [id],
      );
      await manager.query(
        'DELETE FROM report_attachments WHERE "reportId" IN (SELECT id FROM reports WHERE "internId" = $1)',
        [id],
      );
      await manager.query('DELETE FROM reports WHERE "internId" = $1', [id]);
      await manager.query(
        'DELETE FROM tasks WHERE "internId" = $1 OR "managerId" = $1',
        [id],
      );
      await manager.query(
        'UPDATE intern_info SET "managerId" = NULL WHERE "managerId" = $1',
        [id],
      );
      await manager.query(
        'UPDATE intern_info SET "buddyId" = NULL WHERE "buddyId" = $1',
        [id],
      );
      if (target.internInfo) {
        await manager.remove(InternInfo, target.internInfo);
      }
      await manager.remove(User, target);
    });

    await Promise.all(
      attachments.map((attachment) =>
        this.cloudinaryService.deleteFile(attachment.publicId),
      ),
    );

    await this.activityService.logActivity({
      userId: user.id,
      actionType: ActionType.DELETE_USER,
      entityType: EntityType.USER,
      entityId: id,
      description: `User "${target.fullName}" deleted by ${user.email}`,
    });

    this.logger.log(`User deleted: ${target.email} (id=${id})`);

    return { id };
  }

  private async findOneForResponse(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { internInfo: { manager: true, buddy: true } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.formatUser(user);
  }

  private async findRelationshipUser(
    id: number | null | undefined,
    expectedRole: Role,
    label: string,
  ): Promise<User | null> {
    if (id == null) return null;

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`${label} not found`);
    }
    if (user.role !== expectedRole) {
      throw new BadRequestException(`${label} must have role ${expectedRole}`);
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(`${label} must be active`);
    }
    return user;
  }

  private validateInternshipDates(start?: string, end?: string) {
    if (start && Number.isNaN(Date.parse(start))) {
      throw new BadRequestException('Invalid internship start date');
    }
    if (end && Number.isNaN(Date.parse(end))) {
      throw new BadRequestException('Invalid internship end date');
    }
    if (start && end && end < start) {
      throw new BadRequestException(
        'Internship end date must be after the start date',
      );
    }
  }

  private validateUserAccess(target: User, requestUser: JwtPayload) {
    const currentRole = requestUser.role.toUpperCase() as Role;
    if (currentRole === Role.ADMIN || target.id === requestUser.id) return;

    if (
      currentRole === Role.MANAGER &&
      target.role === Role.INTERN &&
      target.internInfo?.manager?.id === requestUser.id
    ) {
      return;
    }
    if (
      currentRole === Role.BUDDY &&
      target.role === Role.INTERN &&
      target.internInfo?.buddy?.id === requestUser.id
    ) {
      return;
    }

    throw new ForbiddenException('You cannot view this user');
  }

  private formatUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.toLowerCase(),
      department: user.department,
      status: user.status,
      isActive: user.status === UserStatus.ACTIVE,
      managerId: user.internInfo?.manager?.id ?? null,
      managerName: user.internInfo?.manager?.fullName ?? null,
      buddyId: user.internInfo?.buddy?.id ?? null,
      buddyName: user.internInfo?.buddy?.fullName ?? null,
      internshipStart: user.internInfo?.internshipStartDate
        ? new Date(user.internInfo.internshipStartDate)
            .toISOString()
            .split('T')[0]
        : null,
      internshipEnd: user.internInfo?.internshipEndDate
        ? new Date(user.internInfo.internshipEndDate)
            .toISOString()
            .split('T')[0]
        : null,
      createdAt: user.createdAt,
    };
  }
}
