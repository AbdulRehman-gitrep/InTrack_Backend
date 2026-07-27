import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Activity } from '../entities/activity.entity';
import { User } from '../entities/user.entity';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

interface LogActivityParams {
  userId: number;
  actionType: string;
  entityType: string;
  entityId: number;
  description?: string;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async logActivity(params: LogActivityParams): Promise<void> {
    await this.activityRepository.save({
      user: { id: params.userId } as User,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
    });

    this.logger.log(
      `Activity logged: ${params.actionType} on ${params.entityType}#${params.entityId} by user#${params.userId}`,
    );
  }

  async findAll(filter: ActivityFilterDto, requestUser: JwtPayload) {
    const {
      page = 1,
      limit = 20,
      search,
      actionType,
      entityType,
      userId,
      startDate,
      endDate,
    } = filter;

    const currentRole = requestUser.role.toUpperCase();
    const qb = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user');

    if (currentRole === 'MANAGER') {
      qb.innerJoin('user.internInfo', 'internInfo')
        .andWhere('internInfo.managerId = :managerId', {
          managerId: requestUser.id,
        });
    }

    if (userId) {
      qb.andWhere('activity.userId = :userId', { userId });
    }
    if (actionType) {
      qb.andWhere('activity.actionType = :actionType', { actionType });
    }
    if (entityType) {
      qb.andWhere('activity.entityType = :entityType', { entityType });
    }
    if (search) {
      qb.andWhere(
        new Brackets((qb2) => {
          qb2.where('activity.description ILIKE :search', {
            search: `%${search}%`,
          });
        }),
      );
    }
    if (startDate) {
      qb.andWhere('activity.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('activity.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [activities, total] = await qb.getManyAndCount();

    return {
      activities: activities.map((a) => this.formatActivity(a)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, requestUser?: JwtPayload) {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const currentRole = requestUser?.role.toUpperCase();
    if (currentRole === 'ADMIN') {
      return this.formatActivity(activity);
    }

    if (currentRole === 'MANAGER') {
      const internInfo = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.internInfo', 'internInfo')
        .where('user.id = :userId', { userId: activity.user.id })
        .andWhere('internInfo.managerId = :managerId', { managerId: requestUser!.id })
        .getOne();

      if (!internInfo) {
        throw new NotFoundException('Activity not found');
      }
      return this.formatActivity(activity);
    }

    throw new NotFoundException('Activity not found');
  }

  private formatActivity(activity: Activity) {
    return {
      id: activity.id,
      user: activity.user
        ? {
            id: activity.user.id,
            fullName: activity.user.fullName,
          }
        : null,
      actionType: activity.actionType,
      entityType: activity.entityType,
      entityId: activity.entityId,
      description: activity.description,
      createdAt: activity.createdAt,
    };
  }
}
