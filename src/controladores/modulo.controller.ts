import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { CreateModuloDto, UpdateModuloDto } from 'src/dtos/modulo.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { ModuloService } from 'src/servicios/modulo.service';

@Controller('modulo')
@UseGuards(RolesGuard)
export class ModuloController {
  constructor(private service: ModuloService) { }

  @Roles(Rol.ADMIN)
  @Post('/update-modulo')
  async updateModulo(@Body() body: UpdateModuloDto | CreateModuloDto) {
    return this.service.updateModulo(body);
  }

  @Roles(Rol.ADMIN)
  @Post()
  async getAllModulosPaginated(@Body() body: PaginationDto) {
    return this.service.getAllModulosPaginated(body);
  }

  @Get('/get-modulos')
  async getModulosNonPaginated() {
    return this.service.getModulos();
  }

  @Roles(Rol.ADMIN)
  @Delete('/:id')
  async deleteModulo(@Param('id') id: string) {
    return this.service.deleteModulo(id);
  }

  @Roles(Rol.ADMIN)
  @Get('/:id')
  async getModulo(@Param('id') id: string) {
    return this.service.getModuloById(Number(id));
  }
}
