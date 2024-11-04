import { Injectable } from '@nestjs/common';
import { PlanificacionBloque } from '@prisma/client';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  CreateBloqueDto,
  CreatePlanificacionMensualDto,
  CreatePlantillaSemanalDto,
  UpdateBloqueDto,
} from 'src/dtos/planificacion.dto';
import * as XLSX from 'xlsx';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class PlanificacionService extends PaginatedService<PlanificacionBloque> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }

  public deleteBloque(bloqueId: string) {
    return this.prisma.planificacionBloque.delete({
      where: {
        id: Number(bloqueId),
      },
    });
  }

  protected getModelName(): string {
    return 'planificacionBloque';
  }

  // Obtener todos los bloques con paginación
  public getAllBloques(dto: PaginationDto) {
    return this.getPaginatedData(
      dto,
      {},
      {
        subBloques: true,
      },
    );
  }

  public async importarExcel(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Asume que los datos están en la primera hoja
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(sheet);
    let insertados = 0;
    for (const entry of jsonData) {
      if (!entry['identificador']) {
        console.log('No hay identificador, ignorando');
        continue;
      }

      // Buscar si ya existe un bloque con el identificador
      const existingBloque = await this.prisma.planificacionBloque.findFirst({
        where: { identificador: entry['identificador'].toString() },
      });

      // Crear bloque si no existe
      let bloque;
      if (existingBloque) {
        console.log(
          `Bloque con identificador ${entry['identificador']} ya existe. Agregando sub-bloques...`,
        );
        bloque = existingBloque;
      } else {
        bloque = await this.prisma.planificacionBloque.create({
          data: {
            identificador: entry['identificador'].toString(),
            descripcion: entry['descripcion'],
          },
        });
        insertados++;
      }

      // Crear sub-bloque
      await this.prisma.subBloque.create({
        data: {
          nombre: entry['nombre'],
          duracion: entry['duracion'],
          comentarios: entry['comentarios'] ?? '',
          bloqueId: bloque.id,
        },
      });
    }

    return {
      message: 'Archivo procesado exitosamente',
      count: insertados,
      ignoradas: jsonData.length - insertados,
    };
  }

  public getBlloque(preguntaId: string) {
    return this.prisma.planificacionBloque.findFirst({
      where: {
        id: Number(preguntaId),
      },
      include: {
        subBloques: true,
      },
    });
  }

  // Crear un nuevo bloque
  public createBloque(dto: CreateBloqueDto) {
    return this.prisma.planificacionBloque.create({
      data: {
        identificador: dto.identificador,
        descripcion: dto.descripcion,
        subBloques: {
          create: dto.subBloques.map((subBloque) => ({
            horaInicio: subBloque.horaInicio,
            duracion: subBloque.duracion,
            nombre: subBloque.nombre,
            comentarios: subBloque.comentarios,
          })),
        },
      },
    });
  }

  // Actualizar un bloque existente
  public async updateBloque(dto: UpdateBloqueDto | CreateBloqueDto) {
    if ('id' in dto) {
      await this.prisma.planificacionBloque.update({
        where: { id: dto.id },
        data: {
          subBloques: {
            deleteMany: {},
          },
        },
      });
      return await this.prisma.planificacionBloque.update({
        where: { id: dto.id },
        data: {
          identificador: dto.identificador,
          descripcion: dto.descripcion,
          subBloques: {
            create: dto.subBloques,
          },
        },
      });
    } else {
      return await this.prisma.planificacionBloque.create({
        data: {
          identificador: dto.identificador,
          descripcion: dto.descripcion,
          subBloques: {
            create: dto.subBloques,
          },
        },
      });
    }
  }

  // Obtener todas las plantillas semanales con paginación
  public getAllPlantillasSemanales(dto: PaginationDto) {
    return this.getPaginatedData(dto, {}, { include: { dias: true } });
  }

  // Crear una nueva plantilla semanal
  public createPlantillaSemanal(dto: CreatePlantillaSemanalDto) {
    return this.prisma.plantillaSemanal.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        dias: {
          create: dto.dias.map((dia) => ({
            dia: dia.dia,
            bloques: {
              connect: dia.bloques.map((bloqueId) => ({ id: bloqueId })),
            },
          })),
        },
      },
    });
  }

  // Obtener todas las planificaciones mensuales con paginación
  public getAllPlanificacionesMensuales(dto: PaginationDto) {
    return this.getPaginatedData(
      dto,
      {},
      { include: { plantillas: true, bloques: true } },
    );
  }

  // Crear una nueva planificación mensual y asignarla a alumnos
  // Crear una nueva planificación mensual y asignarla a alumnos
  public createPlanificacionMensual(dto: CreatePlanificacionMensualDto) {
    return this.prisma.planificacionMensual.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        mes: dto.mes,
        ano: dto.ano,
        plantillas: {
          create: dto.plantillas.map((plantillaId) => ({ plantillaId })),
        },
        bloques: {
          connect: dto.bloquesAdicionales?.map((bloqueId) => ({
            id: bloqueId,
          })),
        },
        asignaciones: {
          create: dto.alumnosAsignados?.map((alumnoId) => ({ alumnoId })),
        },
      },
    });
  }
}
