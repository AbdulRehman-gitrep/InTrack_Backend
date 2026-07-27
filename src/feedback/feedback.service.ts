import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { User } from '../entities/user.entity';
import { ActivityService } from '../activity/activity.service';
import { Role } from '../common/enums/role.enum';
import { ActionType } from '../common/enums/action-type.enum';
import { EntityType } from '../common/enums/entity-type.enum';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly activityService: ActivityService,
  ) {}

  async create(dto: CreateFeedbackDto, user: JwtPayload) {
    const receiver = await this.userRepository.findOne({
      where: { id: dto.toId },
    });

    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    if (receiver.role !== Role.INTERN) {
      throw new BadRequestException('Feedback can only be sent to interns');
    }

    const sender = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const feedback = this.feedbackRepository.create({
      sender,
      receiver,
      content: dto.content,
    });

    const saved = await this.feedbackRepository.save(feedback);

    await this.activityService.logActivity({
      userId: sender.id,
      actionType: ActionType.CREATE_FEEDBACK,
      entityType: EntityType.FEEDBACK,
      entityId: saved.id,
      description: `Feedback sent by ${sender.fullName} to ${receiver.fullName}`,
    });

    this.logger.log(
      `Feedback created: id=${saved.id}, from=${sender.email}, to=${receiver.email}`,
    );

    return this.formatFeedback(saved);
  }

  async findByReceiver(receiverId: number, page: number, limit: number) {
    const [feedback, total] = await this.feedbackRepository.findAndCount({
      where: { receiver: { id: receiverId } },
      relations: { sender: true, receiver: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      feedback: feedback.map((f) => this.formatFeedback(f)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySender(senderId: number, page: number, limit: number) {
    const [feedback, total] = await this.feedbackRepository.findAndCount({
      where: { sender: { id: senderId } },
      relations: { sender: true, receiver: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      feedback: feedback.map((f) => this.formatFeedback(f)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private formatFeedback(feedback: Feedback) {
    return {
      id: feedback.id,
      content: feedback.content,
      createdAt: feedback.createdAt,
      fromId: feedback.sender?.id ?? null,
      fromName: feedback.sender?.fullName ?? null,
      toId: feedback.receiver?.id ?? null,
      toName: feedback.receiver?.fullName ?? null,
    };
  }
}
