import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { FeedbackDto } from 'src/dtos/feedback.dto';
import { NewTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { RegistrarRespuestaDto } from 'src/dtos/registrar-respuesta.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { FeedbackService } from 'src/servicios/feedback.service';
import { TestService } from 'src/servicios/test.service';

@Controller('tests')
@UseGuards(RolesGuard)
export class TestController {
  constructor(
    private service: TestService,
    private feedback: FeedbackService,
  ) {}

  @Roles(Rol.ALUMNO)
  @Get('/por-id/:id')
  async getTestById(@Param('id') id: string) {
    return this.service.getTestById(Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Get('/')
  async getPendingTestsByUserId(@Request() req) {
    const { id } = req.user;
    return this.service.getPendingTestsByUserId(Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Post('/anyadir-feedback')
  async anyadirFeedback(@Request() req, @Body() dto: FeedbackDto) {
    const { id } = req.user;
    dto.usuarioId = id;
    return this.feedback.createFeedback(dto);
  }

  @Roles(Rol.ALUMNO)
  @Get('/finished')
  async getFinishedTestsByUserId(@Request() req) {
    const { id } = req.user;
    return this.service.getFinishedTestsByUserId(Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Post('registrar-respuesta')
  async registrarRespuesta(@Body() dto: RegistrarRespuestaDto, @Request() req) {
    const { id } = req.user;
    return this.service.registrarRespuesta(dto, id);
  }

  @Roles(Rol.ALUMNO)
  @Post('start')
  async startTest(@Body() dto: NewTestDto, @Request() req) {
    const { id, comunidad } = req.user;
    return this.service.startTest(Number(id), dto, comunidad);
  }

  @Roles(Rol.ALUMNO)
  @Delete('/:id')
  async deleteTest(@Param('id') id: string, @Request() req) {
    return this.service.deleteTest(req.user.id, Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Get('/obtener-fallos-count')
  async obtenerFallosCount(@Request() req) {
    const { id } = req.user;
    return this.service.obtenerFallosCount(Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Post('/obtener-fallos')
  async obtenerFallos(@Request() req, @Body() body: PaginationDto) {
    const { id } = req.user;
    return this.service.obtenerFallos(Number(id), body);
  }

  @Roles(Rol.ALUMNO)
  @Get('/test-stats/:id')
  async getTestStats(@Param('id') idTest: string, @Request() req) {
    const { id } = req.user;
    return this.service.obtainTestStats(id, Number(idTest));
  }
}
