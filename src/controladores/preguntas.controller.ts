import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Rol } from '@prisma/client';
import { Response } from 'express'; // Esto es válido incluso si estás usando Fastify
import { NewTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  CreatePreguntaDto,
  UpdatePreguntaDto,
} from 'src/dtos/update-pregunta.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { PreguntasService } from 'src/servicios/preguntas.service';
import { PrismaService } from 'src/servicios/prisma.service';
import { modifyItemId } from 'src/utils/utils';

@Controller('preguntas')
@UseGuards(RolesGuard)
export class PreguntasController {
  constructor(
    private service: PreguntasService,
    private prisma: PrismaService,
  ) { }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Post('/update-pregunta')
  async updatePregunta(
    @Body() body: UpdatePreguntaDto | CreatePreguntaDto,
    @Request() req,
  ) {
    const { id } = req.user;
    return this.service.updatePregunta(body, id);
  }
  @Roles(Rol.ADMIN)
  @Post()
  async getAllPreguntas(@Body() body: PaginationDto) {
    return this.service.getAllPreguntas(body);
  }

  @Roles(Rol.ADMIN)
  @Post('/get-all-preguntas-by-filter')
  async getAllPreguntasByFilter(@Body() body: NewTestDto, @Request() req) {
    const { id, comunidad } = req.user;
    return this.service.generarPreguntasTest(body, id, comunidad);
  }

  @Roles(Rol.ADMIN)
  @Post('/preguntas-creadas-por-alumnos')
  async getAllPreguntasCreadosPorAlumnos(@Res() res: Response) {
    return this.service.getAllPreguntasCreadasPorAlumnos(res);
  }

  @Roles(Rol.ALUMNO)
  @Post('/alumno')
  async getAllPreguntasAlumno(@Body() body: PaginationDto, @Request() req) {
    const { id } = req.user;
    return this.service.getAllPreguntasAlumno(body, id);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Delete('/:id')
  async deletePregunta(@Param('id') id: string) {
    return this.service.deletePregunta(id);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/:id')
  async getPregunta(@Param('id') id: string) {
    return this.service.getPregunta(id);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/next/:identificador')
  async getPreguntaNext(@Param('identificador') id: string) {
    return modifyItemId('PREGUNTA', id, 1, this.prisma);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/next-forward/:identificador')
  async getPreguntaNextForward(@Param('identificador') id: string) {
    return modifyItemId('PREGUNTA', id, 1, this.prisma, true);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/prev/:identificador')
  async getPreguntaPrev(@Param('identificador') id: string) {
    return modifyItemId('PREGUNTA', id, -1, this.prisma);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/prev-forward/:identificador')
  async getPreguntaPrevForward(@Param('identificador') id: string) {
    return modifyItemId('PREGUNTA', id, -1, this.prisma, true);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @UseInterceptors(FileInterceptor('file'))
  @Post('importar-excel')
  async importarExcel(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const { id } = req.user;
    return this.service.importarExcel(file, id);
  }

  @Roles(Rol.ADMIN)
  @Get('/identificador/:identificador')
  async getPreguntaByIdentificador(@Param('identificador') identificador: string) {
    return this.service.getPreguntaByIdentificador(identificador);
  }
}
