import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { Report } from '../entities/report.entity';
import { Feedback } from '../entities/feedback.entity';
import { InternInfo } from '../entities/intern-info.entity';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { TaskStatus } from '../common/enums/task-status.enum';
import { ReportStatus } from '../common/enums/report-status.enum';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(InternInfo)
    private readonly internInfoRepository: Repository<InternInfo>,
  ) {}

  async getAdminDashboard() {
    const [totalUsers, activeInterns, departmentStats] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({
        where: { role: Role.INTERN, status: UserStatus.ACTIVE },
      }),
      this.getDepartmentStats(),
    ]);

    return { totalUsers, activeInterns, departmentStats };
  }

  async getManagerDashboard(userId: number) {
    const managerInternInfos = await this.internInfoRepository.find({
      where: { manager: { id: userId } },
      relations: { intern: true },
    });

    const internIds = managerInternInfos.map((ii) => ii.intern.id);

    const [activeTasks, pendingReports] = await Promise.all([
      internIds.length > 0
        ? this.taskRepository.count({
            where: {
              intern: { id: In(internIds) },
              status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
            },
          })
        : 0,
      internIds.length > 0
        ? this.reportRepository.count({
            where: {
              intern: { id: In(internIds) },
              status: ReportStatus.PENDING,
            },
          })
        : 0,
    ]);

    const internProgress = await Promise.all(
      managerInternInfos.map(async (ii) => {
        const [totalTasks, completedTasks, totalReports, reviewedReports] =
          await Promise.all([
            this.taskRepository.count({
              where: { intern: { id: ii.intern.id } },
            }),
            this.taskRepository.count({
              where: {
                intern: { id: ii.intern.id },
                status: TaskStatus.COMPLETED,
              },
            }),
            this.reportRepository.count({
              where: { intern: { id: ii.intern.id } },
            }),
            this.reportRepository.count({
              where: {
                intern: { id: ii.intern.id },
                status: ReportStatus.REVIEWED,
              },
            }),
          ]);

        return {
          intern: {
            id: ii.intern.id,
            fullName: ii.intern.fullName,
            department: ii.intern.department,
          },
          tasksCompleted: completedTasks,
          totalTasks,
          reportsReviewed: reviewedReports,
          totalReports,
        };
      }),
    );

    return {
      assignedInterns: managerInternInfos.length,
      activeTasks,
      pendingReports,
      internProgress,
    };
  }

  async getBuddyDashboard(userId: number) {
    const buddyInternInfos = await this.internInfoRepository.find({
      where: { buddy: { id: userId } },
      relations: { intern: true },
    });

    const internIds = buddyInternInfos.map((ii) => ii.intern.id);

    const [pendingReports, totalFeedbackGiven] = await Promise.all([
      internIds.length > 0
        ? this.reportRepository.count({
            where: {
              intern: { id: In(internIds) },
              status: ReportStatus.PENDING,
            },
          })
        : 0,
      this.feedbackRepository.count({
        where: { sender: { id: userId } },
      }),
    ]);

    const internProgress = await Promise.all(
      buddyInternInfos.map(async (ii) => {
        const [totalReports, reviewedReports, feedbackCount] =
          await Promise.all([
            this.reportRepository.count({
              where: { intern: { id: ii.intern.id } },
            }),
            this.reportRepository.count({
              where: {
                intern: { id: ii.intern.id },
                status: ReportStatus.REVIEWED,
              },
            }),
            this.feedbackRepository.count({
              where: { receiver: { id: ii.intern.id } },
            }),
          ]);

        return {
          intern: {
            id: ii.intern.id,
            fullName: ii.intern.fullName,
            department: ii.intern.department,
          },
          reportsReviewed: reviewedReports,
          totalReports,
          feedbackCount,
        };
      }),
    );

    return {
      assignedInterns: buddyInternInfos.length,
      pendingReports,
      totalFeedbackGiven,
      internProgress,
    };
  }

  async getInternDashboard(userId: number) {
    const activeStatuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS];

    const [tasks, reportsSubmitted, feedbackReceived] = await Promise.all([
      this.taskRepository.find({
        where: { intern: { id: userId } },
        select: { status: true },
      }),
      this.reportRepository.count({
        where: { intern: { id: userId } },
      }),
      this.feedbackRepository.count({
        where: { receiver: { id: userId } },
      }),
    ]);

    const activeTasks = tasks.filter((t) =>
      activeStatuses.includes(t.status),
    ).length;

    return {
      activeTasks,
      reportsSubmitted,
      feedbackReceived,
      tasks: tasks.map((t) => ({ status: t.status })),
    };
  }

  private async getDepartmentStats(): Promise<
    { title: string; count: number }[]
  > {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('user.department', 'title')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.role = :role', { role: Role.INTERN })
      .andWhere('user.status = :status', { status: 'ACTIVE' })
      .groupBy('user.department')
      .orderBy('COUNT(user.id)', 'DESC')
      .getRawMany<{ title: string; count: number }>();

    return result.map((r) => ({ title: r.title, count: Number(r.count) }));
  }
}
