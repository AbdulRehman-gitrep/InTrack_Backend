import { IsEmail, IsString, MinLength, Validate } from 'class-validator';
import { PasswordPolicyValidator } from '../../common/validators/password.validator';
import { PASSWORD } from '../../common/constants/app.constants';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD.MIN_LENGTH)
  @Validate(PasswordPolicyValidator)
  password!: string;
}
