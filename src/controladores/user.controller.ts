import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
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
  @Get('approve/:id')
  async approve(@Param('id') id: string) {
    return this.usersService.approveUser(Number(id));
  }
  @Roles(Rol.ADMIN)
  @Get('deny/:id')
  async deny(@Param('id') id: string) {
    return this.usersService.denyUser(Number(id));
  }
}
