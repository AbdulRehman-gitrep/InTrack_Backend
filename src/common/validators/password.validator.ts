import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PASSWORD } from '../constants/app.constants';

@ValidatorConstraint({ name: 'passwordPolicy', async: false })
export class PasswordPolicyValidator implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) return false;
    if (!PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) return false;
    if (!PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) return false;
    if (!PASSWORD.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password))
      return false;
    return true;
  }

  defaultMessage(_validationArguments: ValidationArguments): string {
    return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
}
