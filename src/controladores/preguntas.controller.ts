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
import { FileInterceptor } from '@nestjs/platform-express';
import { Rol } from '@prisma/client';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  CreatePreguntaDto,
  UpdatePreguntaDto,
} from 'src/dtos/update-pregunta.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { PreguntasService } from 'src/servicios/preguntas.service';

@Controller('preguntas')
@UseGuards(RolesGuard)
export class PreguntasController {
  constructor(private service: PreguntasService) {}

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
  @UseInterceptors(FileInterceptor('file'))
  @Post('importar-excel')
  async importarExcel(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const { id } = req.user;
    return this.service.importarExcel(file, id);
  }
}
