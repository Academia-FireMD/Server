import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { EmailService } from './email.service';
import { PrismaService } from './prisma.service';
import { UsersService } from './user.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  verifyToken(token: string): any {

    if (!token) {
      throw new ForbiddenException('Acceso denegado');
    }

    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      const errorResult =
        error.name == 'TokenExpiredError' ? 'La sesión ha expirado' : error;
      throw new UnauthorizedException(errorResult);
    }
  }

  async validateUser(email: string, password: string): Promise<Usuario> {
    const user = await this.usersService.findUserByEmail(email);
    if (user && (await bcrypt.compare(password, user.contrasenya))) {
      return user;
    }
    return null;
  }

  async login(user: Usuario) {
    const payload = {
      email: user.email,
      sub: user.id,
      rol: user.validated ? user.rol : 'SIN_APROBACION',
      comunidad: user.comunidad,
      nombre: user.nombre,
      avatarUrl: user.avatarUrl,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '60m', // Access token válido por 60 minutos
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d', // Refresh token válido por 7 días
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // Token válido por 1 hora

    await this.prisma.usuario.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: expires,
      },
    });

    const resetLink = `${process.env.HOST_FRONT}/auth/reset-password?token=${resetToken}`;
    await this.emailService.sendPasswordResetEmail(user.email, resetLink);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token) throw new BadRequestException('El token no existe!');
    const user = await this.prisma.usuario.findMany({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gte: new Date(),
        },
      },
    });
    if (user.length > 1) {
      throw new BadRequestException(
        'No puede haber más de un usuario afectado!',
      );
    }
    if (!user) {
      throw new BadRequestException('Token invalido o expirado');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.usuario.update({
      where: { id: user[0].id },
      data: {
        contrasenya: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }
}
