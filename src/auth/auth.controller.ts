import { Controller,Post } from '@nestjs/common';
import { AuthService } from './auth.service';
@Controller('auth') //prefix for all routes in this controller
export class AuthController {
    private readonly authService: AuthService //internal variable name authService
    constructor(authService: AuthService) {
        this.authService = authService;
        //this.authService = authService; takes the service delivered to the constructor
        //and saves it to a class property so other methods in the class can use it later 
    }
    @Post('authUser') //route for this method
    authUser() {
        return this.authService.authUser();
    }

}
