import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles, RolesGuard } from 'src/guards/roles.guard';

import { FileInterceptor } from '@nestjs/platform-express';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  CreateBloqueDto,
  CreatePlanificacionMensualDto,
  CreatePlantillaSemanalDto,
  UpdateBloqueDto,
} from 'src/dtos/planificacion.dto';
import { PlanificacionService } from 'src/servicios/planification.service';

@UseGuards(RolesGuard)
@Controller('planificaciones')
export class PlanificacionController {
  constructor(private readonly service: PlanificacionService) {}

  // Visualizar la rejilla de todos los bloques creados
  @Roles(Rol.ADMIN)
  @Post('/bloques')
  async getAllBloques(@Body() body: PaginationDto) {
    return this.service.getAllBloques(body);
  }

  @Roles(Rol.ADMIN)
  @Delete('/:id')
  async deleteBloque(@Param('id') id: string) {
    return this.service.deleteBloque(id);
  }

  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @Post('importar-excel')
  async importarExcel(@UploadedFile() file: Express.Multer.File) {
    return this.service.importarExcel(file);
  }

  @Roles(Rol.ADMIN)
  @Get('/:id')
  async getBloque(@Param('id') id: string) {
    return this.service.getBlloque(id);
  }

  @Roles(Rol.ADMIN)
  @Post('/actualizar-bloque')
  async updateBloque(@Body() dto: UpdateBloqueDto | CreateBloqueDto) {
    return this.service.updateBloque(dto);
  }

  // Visualizar planificaciones semanales en una rejilla
  @Roles(Rol.ADMIN)
  @Post('/plantillas-semanales')
  async getAllPlantillasSemanales(@Body() body: PaginationDto) {
    return this.service.getAllPlantillasSemanales(body);
  }

  // Crear una nueva planificacion semanal
  @Roles(Rol.ADMIN)
  @Post('/plantilla-semanal')
  async createPlantillaSemanal(@Body() dto: CreatePlantillaSemanalDto) {
    return this.service.createPlantillaSemanal(dto);
  }

  // Visualizar planificaciones mensuales en una rejilla
  @Roles(Rol.ADMIN)
  @Post('/planificaciones-mensuales')
  async getAllPlanificacionesMensuales(@Body() body: PaginationDto) {
    return this.service.getAllPlanificacionesMensuales(body);
  }

  // Crear una nueva planificacion mensual y asignarla a alumnos
  @Roles(Rol.ADMIN)
  @Post('/planificacion-mensual')
  async createPlanificacionMensual(@Body() dto: CreatePlanificacionMensualDto) {
    return this.service.createPlanificacionMensual(dto);
  }
}
