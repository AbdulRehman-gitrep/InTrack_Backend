import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

describe('JwtStrategy', () => {
  it('uses the current database role instead of the role in the token', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        email: 'admin@example.com',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    } as unknown as Repository<User>;
    const strategy = new JwtStrategy(configService, userRepository);

    await expect(
      strategy.validate({
        id: 1,
        email: 'old@example.com',
        role: 'intern',
      }),
    ).resolves.toEqual({
      id: 1,
      email: 'admin@example.com',
      role: 'admin',
    });
  });
});
