import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './user.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

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
      rol: user.rol,
      comunidad: user.comunidad,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
