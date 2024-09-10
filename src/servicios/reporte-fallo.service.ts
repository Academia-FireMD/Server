import { Injectable } from '@nestjs/common';
import { ReporteFallo } from '@prisma/client';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class ReporteFalloService extends PaginatedService<ReporteFallo> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'reporteFallo';
  }

  async reportarFallo(
    preguntaId: number,
    usuarioId: number,
    descripcion: string,
  ) {
    return this.prisma.reporteFallo.create({
      data: {
        preguntaId,
        usuarioId,
        descripcion,
      },
    });
  }

  async reportarFalloFlashcard(
    flashcardDataId: number,
    usuarioId: number,
    descripcion: string,
  ) {
    return this.prisma.reporteFallo.create({
      data: {
        flashcardDataId,
        usuarioId,
        descripcion,
      },
    });
  }

  // Método opcional para obtener reportes de fallos por pregunta o usuario
  async obtenerReportesPorPregunta(preguntaId: number) {
    return this.prisma.reporteFallo.findMany({
      where: { preguntaId },
    });
  }

  public deleteReporteDeFallo(id: number) {
    return this.prisma.reporteFallo.delete({
      where: {
        id,
      },
    });
  }

  public getAllFallosReportados(
    dto: PaginationDto,
    type: 'test' | 'flashcards',
  ) {
    return this.getPaginatedData(
      dto,
      {
        AND: [
          type == 'test'
            ? {
                preguntaId: {
                  not: null,
                },
              }
            : {
                flashcardDataId: {
                  not: null,
                },
              },
          type == 'test'
            ? {
                pregunta: {
                  identificador: {
                    contains: dto.searchTerm ?? '',
                  },
                },
              }
            : {
                FlashcardData: {
                  identificador: {
                    contains: dto.searchTerm ?? '',
                  },
                },
              },
        ],
      },
      {
        pregunta: {
          include: {
            tema: true,
          },
        },
        FlashcardData: {
          include: {
            tema: true,
          },
        },
      },
    );
  }
}
