import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma.service';
import { Usuario } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, password: string): Promise<Usuario> {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.usuario.create({
      data: {
        email,
        contrasenya: hashedPassword,
      },
    });
  }

  async findUserByEmail(email: string): Promise<Usuario> {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }
}
