import { Injectable } from '@nestjs/common';
import { Tema } from '@prisma/client';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { CreateTemaDto, UpdateTemaDto } from 'src/dtos/tema.dto';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class TemaService extends PaginatedService<Tema> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'tema';
  }

  public getTemaById(id: number) {
    return this.prisma.tema.findFirst({
      where: {
        id,
      },
      include: {
        modulo: true,
      }
    });
  }

  public getAllTemasPaginated(dto: PaginationDto) {
    return this.getPaginatedData(dto, {
      OR: [
        {
          descripcion: {
            contains: dto.searchTerm ?? '',
            mode: 'insensitive',
          },
        },
        {
          numero: {
            contains: dto.searchTerm ?? '',
            mode: 'insensitive',
          },
        },
      ],
      ...dto.where,
    }, {
      modulo: true,
    });
  }
  public getTemas() {
    return this.prisma.tema.findMany({
      include: {
        modulo: true,
      },
    });
  }

  public deleteTema(temaId: string) {
    return this.prisma.tema.delete({
      where: {
        id: Number(temaId),
      },
    });
  }

  public updateTema(dto: UpdateTemaDto | CreateTemaDto) {
    if ('id' in dto) {
      return this.prisma.tema.update({
        where: {
          id: dto.id,
        },
        data: {
          numero: dto.numero + '',
          descripcion: dto.descripcion,
          moduloId: dto.moduloId,
        },
      });
    } else {
      return this.prisma.tema.create({
        data: {
          numero: dto.numero + '',
          descripcion: dto.descripcion,
          moduloId: dto.moduloId,
        },
      });
    }
  }
}
