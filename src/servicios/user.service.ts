import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Comunidad, Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class UsersService extends PaginatedService<Usuario> {
  constructor(
    public prisma: PrismaService,
    private cloudinary: CloudinaryProvider,
  ) {
    super(prisma);
  }

  async getUserProfile(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: {
        suscripcion: true,
      },
    });
  }

  async getUserById(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
    });
  }

  async uploadAvatar(file: Express.Multer.File, usuarioId: number) {
    const folder = 'academia/avatares';
    const secureUrl = await this.cloudinary.uploadFile(file, folder);
    // Guarda la referencia en la base de datos
    if (!usuarioId)
      throw new BadRequestException('Debe existir un usuario seleccionado!');
    const documento = await this.prisma.usuario.update({
      where: {
        id: usuarioId,
      },
      data: {
        avatarUrl: secureUrl,
      },
    });

    return documento;
  }

  async createUser(
    email: string,
    password: string,
    comunidad: Comunidad,
    nombre: string,
    apellidos: string,
    tutorId: number,
    validated: boolean = false,
  ): Promise<Usuario> {
    const foundEmail = await this.prisma.usuario.findUnique({
      where: {
        email,
        comunidad,
      },
    });

    if (foundEmail) {
      throw new BadRequestException('Este email ya ha sido utilizado!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.usuario.create({
      data: {
        email,
        contrasenya: hashedPassword,
        comunidad,
        nombre,
        apellidos,
        tutorId,
        validated,
        validatedAt: validated ? new Date() : null,
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

  public getValidatedUsers(dto: PaginationDto) {
    return this.getPaginatedData(dto, {
      validated: true,
      email: {
        contains: dto.searchTerm ?? '',
      },
    });
  }

  public getAllUsers(dto: PaginationDto) {
    return this.getPaginatedData(
      dto,
      {
        email: {
          contains: dto.searchTerm ?? '',
        },
      },
      {
        tutor: true,
      },
    );
  }

  public getAllTutores() {
    return this.prisma.usuario.findMany({
      where: {
        esTutor: true,
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
        validatedAt: new Date(),
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
    const updatedUser = await this.prisma.usuario.update({
      where: {
        id: userId,
      },
      data: {
        validated: false,
      },
    });
    return updatedUser;
  }

  public async deleteUser(userId: number) {
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
  }

  async updateUser(id: number, updateUserDto: Partial<Usuario>) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (updateUserDto.email && user.email != updateUserDto.email) {
      throw new BadRequestException('No puedes cambiar el email!');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...updateUserDto,
      },
    });
  }
}
