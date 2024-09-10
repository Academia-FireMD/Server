import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  ReportarFalloDto,
  ReportarFalloFlashcardDto,
} from 'src/dtos/reportar-fallo.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { ReporteFalloService } from 'src/servicios/reporte-fallo.service';

@Controller('reportes')
@UseGuards(RolesGuard)
export class ReporteFalloController {
  constructor(private readonly reporteFalloService: ReporteFalloService) {}
  @Roles(Rol.ALUMNO)
  @Post('fallo')
  async reportarFallo(
    @Body() reportarFalloDto: ReportarFalloDto,
    @Request() req,
  ) {
    const { id } = req.user;
    const { preguntaId, descripcion } = reportarFalloDto;
    return this.reporteFalloService.reportarFallo(preguntaId, id, descripcion);
  }

  @Roles(Rol.ALUMNO)
  @Post('fallo-flashcard')
  async reportarFalloFlashcard(
    @Body() reportarFalloDto: ReportarFalloFlashcardDto,
    @Request() req,
  ) {
    const { id } = req.user;
    const { flashcardDataId, descripcion } = reportarFalloDto;
    return this.reporteFalloService.reportarFalloFlashcard(
      flashcardDataId,
      id,
      descripcion,
    );
  }

  @Roles(Rol.ADMIN)
  @Post()
  async getAllFallosReportados(@Body() body: PaginationDto) {
    return this.reporteFalloService.getAllFallosReportados(body, 'test');
  }

  @Roles(Rol.ADMIN)
  @Post('flashcards')
  async getAllFallosReportadosFlashcards(@Body() body: PaginationDto) {
    return this.reporteFalloService.getAllFallosReportados(body, 'flashcards');
  }

  @Roles(Rol.ADMIN)
  @Delete('/:id')
  async eliminarReporteDeFallo(@Param('id') id: string) {
    return this.reporteFalloService.deleteReporteDeFallo(Number(id));
  }
}
