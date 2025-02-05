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
import { NewFlashcardTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { DateRangeDto } from 'src/dtos/range.dto';
import { RegistrarRespuestaFlashcardDto } from 'src/dtos/registrar-respuesta.flashcard.dto';
import {
  CreateFlashcardDataDto,
  UpdateFlashcardDataDto,
} from 'src/dtos/update-flashcard.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import {
  FlashcardService,
  FlashcardTestService,
} from 'src/servicios/flashcard.service';
import { PrismaService } from 'src/servicios/prisma.service';
import { modifyItemId } from 'src/utils/utils';

@UseGuards(RolesGuard)
@Controller('flashcards')
export class FlashcardDataController {
  constructor(
    private readonly service: FlashcardService,
    private readonly serviceTest: FlashcardTestService,
    private prisma: PrismaService,
  ) {}

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

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Post('/update-flashcard')
  async updateFlashcard(
    @Body() body: UpdateFlashcardDataDto | CreateFlashcardDataDto,
    @Request() req,
  ) {
    const { id } = req.user;
    return this.service.updateFlashcard(body, id);
  }

  @Roles(Rol.ALUMNO)
  @Get('/obtener-fallos-count')
  async obtenerFallosCount(@Request() req) {
    const { id } = req.user;
    return this.service.obtenerFallosCount(Number(id));
  }

  @Roles(Rol.ALUMNO, Rol.ADMIN)
  @Get('/test-stats/:id')
  async getTestStats(@Param('id') idTest: string, @Request() req) {
    const { id, role } = req.user;
    return this.service.obtainFlashcardTestStats(
      id,
      Number(idTest),
      role == Rol.ADMIN,
    );
  }

  @Roles(Rol.ALUMNO)
  @Get('/tests')
  async getPendingTestsByUserId(@Request() req) {
    const { id } = req.user;
    return this.service.getPendingTestsByUserId(Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Delete('/delete-test/:id')
  async deleteTest(@Param('id') id: string, @Request() req) {
    return this.service.deleteTest(req.user.id, Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Post('start-test')
  async startTest(@Body() dto: NewFlashcardTestDto, @Request() req) {
    const { id, comunidad } = req.user;
    return this.service.startTest(Number(id), dto, comunidad);
  }

  @Roles(Rol.ALUMNO)
  @Post('/registrar-respuesta')
  async registrarRespuesta(
    @Body() dto: RegistrarRespuestaFlashcardDto,
    @Request() req,
  ) {
    const { id } = req.user;
    return this.service.registrarRespuestaFlashcard(dto, id);
  }

  @Roles(Rol.ALUMNO)
  @Get('/finished')
  async getFinishedTestsByUserId(@Request() req) {
    const { id } = req.user;
    return this.service.getFinishedTestsByUserId(Number(id));
  }

  @Roles(Rol.ALUMNO, Rol.ADMIN)
  @Get('/por-id/:id')
  async getTestById(@Param('id') id: string) {
    return this.service.getTestById(Number(id));
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Delete('/:id')
  async deleteFlashcard(@Param('id') id: string) {
    return this.service.deleteFlashcard(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  async getAllFlashcards(@Body() body: PaginationDto) {
    return this.service.getAllFlashcards(body);
  }

  @Roles(Rol.ALUMNO)
  @Post('/alumno')
  async getAllFlashcardsAlumno(@Request() req, @Body() body: PaginationDto) {
    const { id } = req.user;
    return this.service.getAllFlashcardsAlumno(body, id);
  }

  @Roles(Rol.ALUMNO)
  @Post('/tests-alumno')
  async getAllPreguntasAlumno(@Body() body: PaginationDto, @Request() req) {
    const { id } = req.user;
    return this.serviceTest.getAllFlashcardsTestsAlumno(body, id);
  }

  @Roles(Rol.ADMIN)
  @Post('/tests-admin')
  async getAllPreguntasAdmin(@Body() body: PaginationDto) {
    return this.serviceTest.getAllFlashcardsTestsAdmin(body);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/:id')
  async getFlashcard(@Param('id') id: string) {
    return this.service.getFlashcard(id);
  }

  @Roles(Rol.ALUMNO, Rol.ADMIN)
  @Post('finalizar-test/:id')
  async finalizarTest(@Param('id') testId: string, @Request() req) {
    const { id } = req.user;
    return this.service.finalizarTest(Number(testId), Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Post('/test-stats-by-category/')
  async getTestStatsByCategory(@Body() body: DateRangeDto, @Request() req) {
    const { id } = req.user;
    return this.service.getFlashcardTestsWithCategories(body, id);
  }

  @Roles(Rol.ADMIN)
  @Post('/test-stats-by-category-admin/')
  async getTestStatsByCategoryAdmin(@Body() body: DateRangeDto) {
    return this.service.getFlashcardTestsWithCategories(body);
  }

  @Roles(Rol.ADMIN)
  @Post('/flashcards-creados-por-alumno')
  async getAllFlashcardsCreadasPorAlumnos(@Res() res: Response) {
    return this.service.getAllFlashcardsCreadasPorAlumnos(res);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/next/:identificador')
  async getPreguntaNext(@Param('identificador') id: string) {
    return modifyItemId('FLASHCARD', id, 1, this.prisma);
  }

  @Roles(Rol.ADMIN, Rol.ALUMNO)
  @Get('/prev/:identificador')
  async getPreguntaPrev(@Param('identificador') id: string) {
    return modifyItemId('FLASHCARD', id, -1, this.prisma);
  }
}
