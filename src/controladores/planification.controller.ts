import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Rol, TipoDePlanificacionDeseada } from '@prisma/client';
import { Roles, RolesGuard } from 'src/guards/roles.guard';

import { FileInterceptor } from '@nestjs/platform-express';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  AsignarPlanificacionMensualDto,
  CreateBloqueDto,
  CreateOrUpdateEventoPersonalizadoDto,
  CreateOrUpdatePlanificacionMensualDto,
  CreateOrUpdatePlantillaSemanalDto,
  UpdateBloqueDto,
  UpdateProgresoSubBloqueDto,
  UpdateEventoPersonalizadoRealizadoDto,
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
  @Delete('/plantilla-semanal/:id')
  async deletePlantillaSemanal(@Param('id') id: string) {
    return this.service.deletePlantillaSemanal(Number(id));
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Delete('/planificacion-mensual/:id')
  async deletePlanificacionMensual(@Param('id') id: string, @Request() req) {
    return this.service.deletePlanificacionMensual(Number(id), req.user);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/count-planificationes-asignadas')
  async getBlgetCountPlanificacionesAsignadasAlumnooque(@Request() req) {
    return this.service.getCountPlanificacionesAsignadasAlumno(req.user);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Post('/auto-assign-planificacion-mensual')
  async autoAssignPlanificacionMensual(
    @Body() dto: { tipoDePlanificacion: TipoDePlanificacionDeseada },
    @Request() req,
  ) {
    return this.service.assignDefaultPlanificationToSpecificAlumno(
      req.user.id,
      dto.tipoDePlanificacion,
    );
  }

  @Roles(Rol.ADMIN)
  @Post('/auto-assign-planificacion-mensual-all')
  async autoAssignPlanificacionMensualAll() {
    return this.service.assignDefaultPlanificationToAllAlumnos();
  }

  @Roles(Rol.ADMIN)
  @Post('/asignar-planificacion-mensual')
  async asignarPlanificacionMensual(
    @Body()
    dto: AsignarPlanificacionMensualDto,
  ) {
    const { planificacionId, alumnosIds } = dto;
    return this.service.asignarPlanificacionMensual(
      planificacionId,
      alumnosIds,
    );
  }

  // Endpoint para actualizar el progreso de un subbloque
  @Roles(Rol.ALUMNO)
  @Post('/actualizar-progreso-subbloque')
  async actualizarProgresoSubBloque(
    @Body() dto: UpdateProgresoSubBloqueDto,
    @Request() req,
  ) {
    return this.service.actualizarProgresoSubBloque(
      req.user.id,
      dto.subBloqueId,
      {
        realizado: dto.realizado,
        comentariosAlumno: dto.comentariosAlumno,
        posicionPersonalizada: dto.posicionPersonalizada,
      },
    );
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
  async createPlantillaSemanal(@Body() dto: CreateOrUpdatePlantillaSemanalDto) {
    return this.service.createPlantillaSemanal(dto);
  }

  @Roles(Rol.ADMIN)
  @Get('/plantillas-semanales/:id')
  async getPlantillaSemanal(@Param('id') id: string) {
    return this.service.getPlantillaSemanal(id);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/planificaciones-mensuales/:id')
  async getPlanificacionMensual(@Param('id') id: string, @Request() req) {
    // Si es alumno, mostrar con su progreso
    if (req.user.role === Rol.ALUMNO) {
      return this.service.getPlanificacionMensualConProgresoAlumno(
        Number(id),
        req.user.id,
      );
    }
    return this.service.getPlanificacionMensual(id);
  }

  // Visualizar planificaciones mensuales en una rejilla
  @Roles(Rol.ADMIN)
  @Post('/planificaciones-mensuales')
  async getAllPlanificacionesMensuales(@Body() body: PaginationDto) {
    return this.service.getAllPlanificacionesMensuales(body);
  }

  @Roles(Rol.ADMIN)
  @Post('/comentarios-alumnos-planificacion')
  async comentariosPlanificacionAlumnos(@Body() body: PaginationDto) {
    return this.service.getAllComentariosAlumnos(body);
  }

  @Roles(Rol.ALUMNO)
  @Post('/planificaciones-mensuales-alumno')
  async getAllPlanificacionesMensualesAlumno(
    @Body() body: PaginationDto,
    @Request() req,
  ) {
    const { id } = req.user;
    return this.service.getAllPlanificacionesMensualesAlumnoConProgreso(
      body,
      Number(id),
    );
  }

  // Crear una nueva planificacion mensual y asignarla a alumnos
  @Roles(Rol.ADMIN)
  @Post('/planificacion-mensual')
  async createPlanificacionMensual(
    @Body() dto: CreateOrUpdatePlanificacionMensualDto,
  ) {
    return this.service.createOrUpdatePlanificacionMensual(dto);
  }

  @Roles(Rol.ADMIN)
  @Post('/planificacion-mensual/clonar/:id')
  clonarPlanificacion(@Param('id') id: string) {
    return this.service.clonarPlanificacionMensual(id);
  }

  @Roles(Rol.ALUMNO)
  @Get('/eventos-personalizados/:planificacionId')
  async getEventosPersonalizadosAlumno(
    @Param('planificacionId') planificacionId: string,
    @Request() req,
  ) {
    return this.service.getEventosPersonalizadosAlumno(
      Number(planificacionId),
      req.user.id,
    );
  }

  @Roles(Rol.ALUMNO)
  @Post('/eventos-personalizados')
  async crearEventoPersonalizadoAlumno(
    @Body() dto: CreateOrUpdateEventoPersonalizadoDto,
    @Request() req,
  ) {
    return this.service.crearEventoPersonalizadoAlumno(
      req.user.id,
      dto,
    );
  }

  @Roles(Rol.ALUMNO)
  @Post('/eventos-personalizados/actualizar')
  async actualizarEventoPersonalizadoAlumno(
    @Body() dto: CreateOrUpdateEventoPersonalizadoDto,
    @Request() req,
  ) {
    return this.service.actualizarEventoPersonalizadoAlumno(
      req.user.id,
      dto,
    );
  }

  @Roles(Rol.ALUMNO)
  @Post('/eventos-personalizados/actualizar-realizado')
  async actualizarRealizadoEventoPersonalizado(
    @Body() dto: UpdateEventoPersonalizadoRealizadoDto,
    @Request() req,
  ) {
    return this.service.actualizarEventoPersonalizadoRealizado(
      req.user.id,
      dto,
    );
  }

  @Roles(Rol.ALUMNO)
  @Delete('/eventos-personalizados/:id')
  async eliminarEventoPersonalizadoAlumno(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.service.eliminarEventoPersonalizadoAlumno(
      req.user.id,
      Number(id),
    );
  }
}
