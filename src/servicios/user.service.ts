import { BadRequestException, Injectable } from '@nestjs/common';
import { Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class UsersService extends PaginatedService<Usuario> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }

  async createUser(email: string, password: string): Promise<Usuario> {
    const foundEmail = await this.prisma.usuario.findUnique({
      where: {
        email,
      },
    });
    if (!!foundEmail)
      throw new BadRequestException('Este email ya ha sido utilizado!');
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

  protected getModelName(): string {
    return 'usuario';
  }

  public getPendingUsers(dto: PaginationDto) {
    return this.getPaginatedData(dto, {
      validated: false,
      email: {
        contains: dto.searchTerm ?? '',
      },
    });
  }

  public async approveUser(userId: number) {
    const foundUser = await this.prisma.usuario.findFirst({
      where: {
        id: userId,
      },
    });
    if (!foundUser) throw new BadRequestException('El usuario no existe!');
    const updatedUser = await this.prisma.usuario.update({
      where: {
        id: userId,
      },
      data: {
        validated: true,
      },
    });
    return updatedUser.id;
  }

  public async denyUser(userId: number) {
    const foundUser = await this.prisma.usuario.findFirst({
      where: {
        id: userId,
      },
    });
    if (!foundUser) throw new BadRequestException('El usuario no existe!');
    await this.prisma.usuario.delete({
      where: {
        id: userId,
      },
    });
    return userId;
  }
}
