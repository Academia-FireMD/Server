import { Injectable } from '@nestjs/common';
import { Modulo } from '@prisma/client';
import { CreateModuloDto, UpdateModuloDto } from 'src/dtos/modulo.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class ModuloService extends PaginatedService<Modulo> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'modulo';
  }

  public getModuloById(id: number) {
    return this.prisma.modulo.findFirst({
      where: {
        id,
      },
      include: {
        _count: {
          select: { temas: true }
        }
      }
    });
  }

  public getAllModulosPaginated(dto: PaginationDto) {
    return this.getPaginatedData(dto, 
      {
        nombre: {
          contains: dto.searchTerm ?? '',
          mode: 'insensitive',
        },
        ...dto.where
      },
      {
        _count: {
          select: { temas: true }
        }
      }
    );
  }

  public getModulos() {
    return this.prisma.modulo.findMany({
      include: {
        _count: {
          select: { temas: true }
        }
      }
    });
  }

  public async deleteModulo(moduloId: string) {
    // Primero obtenemos el módulo con el conteo de temas
    const modulo = await this.prisma.modulo.findUnique({
      where: { id: Number(moduloId) },
      include: {
        _count: {
          select: { temas: true }
        }
      }
    });

    if (!modulo) {
      throw new Error('Módulo no encontrado');
    }

    // Eliminamos el módulo (los temas se eliminarán en cascada)
    return {
      deleted: await this.prisma.modulo.delete({
        where: { id: Number(moduloId) },
      }),
      temasEliminados: modulo._count.temas
    };
  }

  public updateModulo(dto: UpdateModuloDto | CreateModuloDto) {
    if ('id' in dto) {
      return this.prisma.modulo.update({
        where: {
          id: dto.id,
        },
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          esPublico: dto.esPublico,
        },
        include: {
          _count: {
            select: { temas: true }
          }
        }
      });
    } else {
      return this.prisma.modulo.create({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          esPublico: dto.esPublico,
        },
        include: {
          _count: {
            select: { temas: true }
          }
        }
      });
    }
  }
}
