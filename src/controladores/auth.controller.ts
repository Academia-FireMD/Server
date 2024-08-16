import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from 'src/servicios/auth.service';
import { UsersService } from 'src/servicios/user.service';
import { validate } from 'class-validator';
import { LoginDto } from 'src/dtos/login.dto';
import { RegisterDto } from 'src/dtos/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { email, password } = body;
    await this.usersService.createUser(email, password);
    return { message: 'Usuario registrado exitosamente' };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const errors = await validate(body);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Los datos no son válidos');
    }
    if (!user.validated) {
      throw new UnauthorizedException(
        'El usuario no ha sido aprobado todavía.',
      );
    }
    return this.authService.login(user);
  }
}
