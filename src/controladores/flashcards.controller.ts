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
import { NewFlashcardTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { RegistrarRespuestaFlashcardDto } from 'src/dtos/registrar-respuesta.flashcard.dto';
import {
  CreateFlashcardDataDto,
  UpdateFlashcardDataDto,
} from 'src/dtos/update-flashcard.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { FlashcardService } from 'src/servicios/flashcard.service';

@UseGuards(RolesGuard)
@Controller('flashcards')
export class FlashcardDataController {
  constructor(private readonly service: FlashcardService) {}

  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @Post('importar-excel')
  async importarExcel(@UploadedFile() file: Express.Multer.File) {
    return this.service.importarExcel(file);
  }

  @Roles(Rol.ADMIN)
  @Post('/update-flashcard')
  async updateFlashcard(
    @Body() body: UpdateFlashcardDataDto | CreateFlashcardDataDto,
  ) {
    return this.service.updateFlashcard(body);
  }

  @Roles(Rol.ALUMNO)
  @Get('/obtener-fallos-count')
  async obtenerFallosCount(@Request() req) {
    const { id } = req.user;
    return this.service.obtenerFallosCount(Number(id));
  }

  @Roles(Rol.ALUMNO)
  @Get('/test-stats/:id')
  async getTestStats(@Param('id') idTest: string, @Request() req) {
    const { id } = req.user;
    return this.service.obtainFlashcardTestStats(id, Number(idTest));
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

  @Roles(Rol.ALUMNO)
  @Get('/por-id/:id')
  async getTestById(@Param('id') id: string) {
    return this.service.getTestById(Number(id));
  }

  @Roles(Rol.ADMIN)
  @Delete('/:id')
  async deleteFlashcard(@Param('id') id: string) {
    return this.service.deleteFlashcard(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  async getAllFlashcards(@Body() body: PaginationDto) {
    return this.service.getAllFlashcards(body);
  }

  @Roles(Rol.ADMIN)
  @Get('/:id')
  async getFlashcard(@Param('id') id: string) {
    return this.service.getFlashcard(id);
  }
}
