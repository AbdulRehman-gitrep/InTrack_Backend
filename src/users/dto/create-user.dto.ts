import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PasswordPolicyValidator } from '../../common/validators/password.validator';
import { Role } from '../../common/enums/role.enum';
import { PASSWORD } from '../../common/constants/app.constants';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD.MIN_LENGTH)
  @Validate(PasswordPolicyValidator)
  password!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsOptional()
  @IsString()
  internshipStart?: string;

  @IsOptional()
  @IsString()
  internshipEnd?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  managerId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  buddyId?: number;
}
