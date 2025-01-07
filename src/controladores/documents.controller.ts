import {
    Body,
    Controller,
    Delete,
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
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { DocumentosService } from 'src/servicios/documents.service';

@Controller('documentos')
@UseGuards(RolesGuard)
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Post('upload')
  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocumento(
    @UploadedFile() file: Express.Multer.File,
    @Body('identificador') identificador: string,
    @Body('descripcion') descripcion: string,
    @Body('esPublico') esPublico: boolean,
    @Request() req,
  ) {
    const { id } = req.user;
    return this.documentosService.uploadDocumento(
      file,
      identificador,
      descripcion,
      esPublico,
      id,
    );
  }

  @Post('publicos')
  @Roles(Rol.ADMIN, Rol.ALUMNO)
  async listarDocumentosPublicos(@Body() body: PaginationDto) {
    return this.documentosService.listarDocumentosPublicos(body);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  async eliminarDocumento(@Param('id') id: number) {
    return this.documentosService.eliminarDocumento(id);
  }
}
