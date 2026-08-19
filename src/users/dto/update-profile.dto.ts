import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Validate,
} from 'class-validator';
import { PasswordPolicyValidator } from '../../common/validators/password.validator';
import { PASSWORD } from '../../common/constants/app.constants';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  @MinLength(PASSWORD.MIN_LENGTH)
  @Validate(PasswordPolicyValidator)
  password?: string;
}
