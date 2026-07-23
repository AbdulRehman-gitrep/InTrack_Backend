import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { InternInfo } from '../entities/intern-info.entity';
import { UserStatus } from '../common/enums/user-status.enum';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(InternInfo)
    private readonly internInfoRepository: Repository<InternInfo>,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      this.logger.warn(
        `Attempt to create user with duplicate email: ${dto.email}`,
      );
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      department: dto.department,
    });
    const saved = await this.userRepository.save(user);

    if (dto.role === Role.INTERN) {
      const internInfo = this.internInfoRepository.create({
        intern: saved,
        ...(dto.internshipStart && {
          internshipStartDate: dto.internshipStart,
        }),
        ...(dto.internshipEnd && { internshipEndDate: dto.internshipEnd }),
        ...(dto.managerId && { manager: { id: dto.managerId } }),
        ...(dto.buddyId && { buddy: { id: dto.buddyId } }),
      });
      await this.internInfoRepository.save(internInfo);
    }

    this.logger.log(`User created: ${saved.email} (${saved.role})`);

    const userWithRelations = await this.userRepository.findOne({
      where: { id: saved.id },
      relations: { internInfo: { manager: true, buddy: true } },
    });

    return this.formatUser(userWithRelations!);
  }

  async findAll(query: FindAllUsersDto) {
    const { page = 1, limit = 10, role, department, status, search } = query;

    const baseWhere: FindOptionsWhere<User> = {};
    if (role) baseWhere.role = role;
    if (department) baseWhere.department = department;
    if (status) baseWhere.status = status;

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
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      users: users.map((u) => this.formatUser(u)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { internInfo: { manager: true, buddy: true } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUser(user);
  }

  async update(id: number, dto: UpdateUserDto) {
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

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.password !== undefined) user.password = dto.password;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.department !== undefined) user.department = dto.department;
    const saved = await this.userRepository.save(user);

    if (user.role === Role.INTERN) {
      const internInfo =
        user.internInfo ?? this.internInfoRepository.create({ intern: saved });
      if (dto.internshipStart !== undefined)
        internInfo.internshipStartDate = new Date(dto.internshipStart);
      if (dto.internshipEnd !== undefined)
        internInfo.internshipEndDate = new Date(dto.internshipEnd);
      if (dto.managerId !== undefined)
        internInfo.manager = { id: dto.managerId } as User;
      if (dto.buddyId !== undefined)
        internInfo.buddy = { id: dto.buddyId } as User;
      await this.internInfoRepository.save(internInfo);
    }

    this.logger.log(`User updated: ${saved.email}`);

    const updated = await this.userRepository.findOne({
      where: { id },
      relations: { internInfo: { manager: true, buddy: true } },
    });

    return this.formatUser(updated!);
  }

  async changeStatus(id: number, dto: UpdateUserStatusDto) {
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

    return this.formatUser(saved);
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
      buddyId: user.internInfo?.buddy?.id ?? null,
      internshipStart: user.internInfo?.internshipStartDate
        ? user.internInfo.internshipStartDate.toISOString().split('T')[0]
        : null,
      internshipEnd: user.internInfo?.internshipEndDate
        ? user.internInfo.internshipEndDate.toISOString().split('T')[0]
        : null,
      createdAt: user.createdAt,
    };
  }
}
