import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { ActivityService } from '../activity/activity.service';
import { TaskStatus } from '../common/enums/task-status.enum';
import { Role } from '../common/enums/role.enum';
import { ActionType } from '../common/enums/action-type.enum';
import { EntityType } from '../common/enums/entity-type.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { FindAllTasksDto } from './dto/find-all-tasks.dto';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.PENDING, TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
};

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly activityService: ActivityService,
  ) {}

  async create(dto: CreateTaskDto, user: JwtPayload) {
    const intern = await this.userRepository.findOne({
      where: { id: dto.internId },
    });

    if (!intern) {
      throw new NotFoundException('Intern not found');
    }

    if (intern.role !== Role.INTERN) {
      throw new BadRequestException('Assigned user must have role INTERN');
    }

    const manager = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description,
      intern,
      manager,
      dueDate: new Date(dto.dueDate),
      status: TaskStatus.PENDING,
    });

    const saved = await this.taskRepository.save(task);

    await this.activityService.logActivity({
      userId: manager.id,
      actionType: ActionType.CREATE_TASK,
      entityType: EntityType.TASK,
      entityId: saved.id,
      description: `Task "${saved.title}" created by ${manager.fullName} for ${intern.fullName}`,
    });

    this.logger.log(`Task created: ${saved.title} (id=${saved.id})`);

    return this.formatTask(saved);
  }

  async findAll(query: FindAllTasksDto, user: JwtPayload) {
    const { page = 1, limit = 10, status, internId, managerId, search } = query;
    const currentRole = user.role.toUpperCase() as Role;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.intern', 'intern')
      .leftJoinAndSelect('task.manager', 'manager');

    if (currentRole === Role.INTERN) {
      qb.andWhere('task.internId = :userId', { userId: user.id });
    } else if (currentRole === Role.MANAGER) {
      qb.andWhere('task.managerId = :userId', { userId: user.id });
    } else if (currentRole === Role.BUDDY) {
      qb.leftJoin('intern.internInfo', 'internInfo').andWhere(
        'internInfo.buddyId = :buddyId',
        { buddyId: user.id },
      );
    }

    if (status) {
      qb.andWhere('task.status = :status', { status });
    }
    if (internId) {
      qb.andWhere('task.internId = :internId', { internId });
    }
    if (managerId) {
      qb.andWhere('task.managerId = :managerId', { managerId });
    }
    if (search) {
      qb.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tasks, total] = await qb.getManyAndCount();

    return {
      tasks: tasks.map((t) => this.formatTask(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, user: JwtPayload) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: { intern: true, manager: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const currentRole = user.role.toUpperCase() as Role;

    if (currentRole === Role.INTERN && task.intern.id !== user.id) {
      throw new ForbiddenException('You can only view your own tasks');
    }
    if (currentRole === Role.MANAGER && task.manager.id !== user.id) {
      throw new ForbiddenException('You can only view your own tasks');
    }
    if (currentRole === Role.BUDDY) {
      const internInfo = await this.userRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.internInfo', 'ii')
        .where('u.id = :internId', { internId: task.intern.id })
        .andWhere('ii.buddyId = :buddyId', { buddyId: user.id })
        .getOne();
      if (!internInfo) {
        throw new ForbiddenException(
          'You can only view your assigned interns tasks',
        );
      }
    }

    return this.formatTask(task);
  }

  async update(id: number, dto: UpdateTaskDto, user: JwtPayload) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: { intern: true, manager: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.dueDate !== undefined) task.dueDate = new Date(dto.dueDate);

    if (dto.internId !== undefined) {
      const intern = await this.userRepository.findOne({
        where: { id: dto.internId },
      });
      if (!intern) {
        throw new NotFoundException('Intern not found');
      }
      if (intern.role !== Role.INTERN) {
        throw new BadRequestException('Assigned user must have role INTERN');
      }
      task.intern = intern;
    }

    const saved = await this.taskRepository.save(task);

    await this.activityService.logActivity({
      userId: user.id,
      actionType: ActionType.UPDATE_TASK,
      entityType: EntityType.TASK,
      entityId: saved.id,
      description: `Task "${saved.title}" updated by ${user.email}`,
    });

    this.logger.log(`Task updated: ${saved.title} (id=${saved.id})`);

    return this.formatTask(saved);
  }

  async updateStatus(id: number, dto: UpdateTaskStatusDto, user: JwtPayload) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: { intern: true, manager: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.intern.id !== user.id) {
      throw new ForbiddenException(
        'You can only update the status of your own tasks',
      );
    }

    const allowed = VALID_TRANSITIONS[task.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${task.status} to ${dto.status}`,
      );
    }

    task.status = dto.status;
    const saved = await this.taskRepository.save(task);

    const actionType =
      dto.status === TaskStatus.COMPLETED
        ? ActionType.UPDATE_TASK_STATUS
        : ActionType.UPDATE_TASK_STATUS;

    await this.activityService.logActivity({
      userId: user.id,
      actionType,
      entityType: EntityType.TASK,
      entityId: saved.id,
      description: `Task "${saved.title}" status changed to ${saved.status} by ${user.email}`,
    });

    this.logger.log(
      `Task status updated: ${saved.title} -> ${saved.status} (id=${saved.id})`,
    );

    return this.formatTask(saved);
  }

  async remove(id: number, user: JwtPayload) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: { intern: true, manager: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.taskRepository.remove(task);

    await this.activityService.logActivity({
      userId: user.id,
      actionType: ActionType.DELETE_TASK,
      entityType: EntityType.TASK,
      entityId: id,
      description: `Task "${task.title}" deleted by ${user.email}`,
    });

    this.logger.log(`Task deleted: ${task.title} (id=${id})`);

    return { id };
  }

  private formatTask(task: Task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate:
        task.dueDate instanceof Date
          ? task.dueDate.toISOString().split('T')[0]
          : task.dueDate,
      createdAt: task.createdAt,
      internId: task.intern?.id ?? null,
      internName: task.intern?.fullName ?? null,
      managerId: task.manager?.id ?? null,
      managerName: task.manager?.fullName ?? null,
    };
  }
}
