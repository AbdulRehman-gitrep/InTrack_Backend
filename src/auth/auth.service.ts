import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserStatus } from '../common/enums/user-status.enum';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      this.logger.warn(`Login attempt with unknown email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Inactive user login attempt: ${email}`);
      throw new ForbiddenException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    const accessToken = this.generateToken(user);

    this.logger.log(`User logged in: ${user.email} (${user.role})`);

    return {
      token: accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.toLowerCase(),
        department: user.department,
      },
    };
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    };
    return this.jwtService.sign(payload);
  }

  async getMe(userPayload: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: userPayload.id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.toLowerCase(),
      department: user.department,
      isActive: user.status === UserStatus.ACTIVE,
      createdAt: user.createdAt,
    };
  }
}
