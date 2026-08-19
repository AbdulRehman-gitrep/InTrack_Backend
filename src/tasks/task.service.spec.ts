import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TaskService } from './task.service';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { ActivityService } from '../activity/activity.service';
import { Role } from '../common/enums/role.enum';
import { TaskStatus } from '../common/enums/task-status.enum';

describe('TaskService authorization', () => {
  const saveTask = jest.fn();
  const taskRepository = {
    findOne: jest.fn(),
    save: saveTask,
  } as unknown as Repository<Task>;
  const userRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<User>;
  const activityService = {
    logActivity: jest.fn(),
  } as unknown as ActivityService;

  const service = new TaskService(
    taskRepository,
    userRepository,
    activityService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects task creation for an intern assigned to another manager', async () => {
    jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce({
      id: 10,
      role: Role.INTERN,
      internInfo: { manager: { id: 99 } },
    } as User);

    await expect(
      service.create(
        {
          title: 'Restricted task',
          internId: 10,
          dueDate: '2026-09-01',
        },
        { id: 1, email: 'manager@example.com', role: 'manager' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects updates to a task created by another manager', async () => {
    jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce({
      id: 5,
      title: 'Owned task',
      status: TaskStatus.PENDING,
      intern: { id: 10 },
      manager: { id: 99 },
    } as Task);

    await expect(
      service.update(
        5,
        { title: 'Unauthorized change' },
        { id: 1, email: 'manager@example.com', role: 'manager' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(saveTask).not.toHaveBeenCalled();
  });
});
