import { Injectable } from '@nestjs/common';
import { UserService } from '../users/user.service';

@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService) {}
    authUser() {
        const res= this.userService.createUser(); //calls the createUser method from the UserService
        return { message: 'Auth service is working', res };
    }
}
