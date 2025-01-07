import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class DocumentosService extends PaginatedService<Document> {
  constructor(
    prisma: PrismaService,
    private cloudinary: CloudinaryProvider,
  ) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'documento';
  }

  async uploadDocumento(
    file: Express.Multer.File,
    identificador: string,
    descripcion: string,
    esPublico: boolean,
    usuarioId?: number,
  ) {
    const folder = 'academia/documentos';
    const uploadResult = await this.cloudinary.uploadFile(file, folder);

    // Guarda la referencia en la base de datos
    const documento = await this.prisma.documento.create({
      data: {
        identificador,
        descripcion,
        url: uploadResult.secure_url,
        esPublico: Boolean(esPublico),
        createdById: Number(usuarioId),
        updatedById: Number(usuarioId),
      },
    });

    return documento;
  }

  async listarDocumentosPublicos(dto: PaginationDto) {
    return this.getPaginatedData(dto, {
      identificador: {
        contains: dto.searchTerm ?? '',
        mode: 'insensitive',
      },
      esPublico: true,
    });
  }

  async eliminarDocumento(id: number) {
    const documento = await this.prisma.documento.findUnique({ where: { id } });

    if (!documento) {
      throw new NotFoundException('Documento no encontrado.');
    }

    // Elimina el documento de la base de datos
    await this.prisma.documento.delete({ where: { id } });

    return { message: 'Documento eliminado correctamente.' };
  }
}
