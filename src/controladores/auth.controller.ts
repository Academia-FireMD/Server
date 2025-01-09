import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { validate } from 'class-validator';
import { LoginDto } from 'src/dtos/login.dto';
import { RegisterDto } from 'src/dtos/register.dto';
import { AuthService } from 'src/servicios/auth.service';
import { UsersService } from 'src/servicios/user.service';
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { email, password, comunidad, nombre, apellidos, tutorId } = body;
    await this.usersService.createUser(
      email,
      password,
      comunidad,
      nombre,
      apellidos,
      tutorId,
    );
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

  @Post('request-password-reset')
  async requestPasswordReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    try {
      // Verifica el refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Si el refresh token es válido, genera un nuevo access token
      const newAccessToken = this.jwtService.sign(
        {
          email: payload.email,
          sub: payload.sub,
          rol: payload.rol,
          comunidad: payload.comunidad,
          nombre: payload.nombre,
        },
        { expiresIn: '60m' }, // Nueva duración del access token
      );

      return { access_token: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }
}
