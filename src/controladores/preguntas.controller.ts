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

  @Roles(Rol.ADMIN)
  @Post('/update-pregunta')
  async updatePregunta(@Body() body: UpdatePreguntaDto | CreatePreguntaDto) {
    return this.service.updatePregunta(body);
  }
  @Roles(Rol.ADMIN)
  @Post()
  async getAllPreguntas(@Body() body: PaginationDto) {
    return this.service.getAllPreguntas(body);
  }

  @Roles(Rol.ADMIN)
  @Delete('/:id')
  async deletePregunta(@Param('id') id: string) {
    return this.service.deletePregunta(id);
  }

  @Roles(Rol.ADMIN)
  @Get('/get-temas')
  async getTemas() {
    return this.service.getDistinctTemas();
  }

  @Roles(Rol.ADMIN)
  @Get('/:id')
  async getPregunta(@Param('id') id: string) {
    return this.service.getPregunta(id);
  }

  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @Post('importar-excel')
  async importarExcel(@UploadedFile() file: Express.Multer.File) {
    return this.service.importarExcel(file);
  }
}
