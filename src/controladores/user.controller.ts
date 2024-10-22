import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { UsersService } from 'src/servicios/user.service';

@Controller('user')
@UseGuards(RolesGuard)
export class UserController {
  constructor(private usersService: UsersService) {}
  @Roles(Rol.ADMIN)
  @Post('pending')
  async pending(@Body() body: PaginationDto) {
    return this.usersService.getPendingUsers(body);
  }
  @Roles(Rol.ADMIN)
  @Post('validated')
  async validated(@Body() body: PaginationDto) {
    return this.usersService.getValidatedUsers(body);
  }
  @Roles(Rol.ADMIN)
  @Post('all')
  async all(@Body() body: PaginationDto) {
    return this.usersService.getAllUsers(body);
  }

  @Get('tutores')
  async tutores() {
    return this.usersService.getAllTutores();
  }

  @Roles(Rol.ADMIN)
  @Get('approve/:id')
  async approve(@Param('id') id: string) {
    return this.usersService.approveUser(Number(id));
  }
  @Roles(Rol.ADMIN)
  @Get('delete/:id')
  async delete(@Param('id') id: string) {
    return this.usersService.deleteUser(Number(id));
  }
  @Roles(Rol.ADMIN)
  @Get('deny/:id')
  async deny(@Param('id') id: string) {
    return this.usersService.denyUser(Number(id));
  }
  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Post('get-by-email')
  async getByEmail(@Body() body: { email: string }) {
    return this.usersService.prisma.usuario.findFirst({
      where: {
        email: body.email,
      },
    });
  }
  @Roles(Rol.ADMIN)
  @Post('update/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<Usuario>,
  ) {
    if (!id) throw new BadRequestException('Id es necesario!');
    return this.usersService.updateUser(Number(id), updateUserDto);
  }
}
