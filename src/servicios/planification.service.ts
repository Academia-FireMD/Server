import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PlanificacionBloque,
  PlanificacionMensual,
  PlantillaSemanal,
  SubBloque,
  TipoDePlanificacionDeseada,
} from '@prisma/client';
import { cloneDeep } from 'lodash';
import { firstValueFrom, forkJoin } from 'rxjs';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  CreateBloqueDto,
  CreateOrUpdatePlanificacionMensualDto,
  CreateOrUpdatePlantillaSemanalDto,
  UpdateBloqueDto,
} from 'src/dtos/planificacion.dto';
import * as XLSX from 'xlsx';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';
@Injectable()
export class PlantillaSemanalService extends PaginatedService<PlantillaSemanal> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }
  protected getModelName(): string {
    return 'plantillaSemanal';
  }
}

@Injectable()
export class PlanificacionMensualService extends PaginatedService<PlanificacionMensual> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }
  protected getModelName(): string {
    return 'planificacionMensual';
  }
}

@Injectable()
export class SubBloqueService extends PaginatedService<SubBloque> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }
  protected getModelName(): string {
    return 'subBloque';
  }
}

@Injectable()
export class PlanificacionService extends PaginatedService<PlanificacionBloque> {
  constructor(
    protected prisma: PrismaService,
    private plantillaSemanal: PlantillaSemanalService,
    private planificacionMensual: PlanificacionMensualService,
    private subbloqueService: SubBloqueService,
  ) {
    super(prisma);
  }

  public deleteBloque(bloqueId: string) {
    return this.prisma.planificacionBloque.delete({
      where: {
        id: Number(bloqueId),
      },
    });
  }

  public async deletePlantillaSemanal(plantillaSemanalId: number) {
    await this.prisma.$transaction(async (prisma) => {
      const foundPlantillaSemanal = await prisma.plantillaSemanal.findFirst({
        where: {
          id: Number(plantillaSemanalId),
        },
        include: {
          subBloques: true,
        },
      });
      if (!foundPlantillaSemanal)
        throw new BadRequestException('Esta plantilla semanal no existe!');
      await prisma.subBloque.deleteMany({
        where: {
          id: {
            in: foundPlantillaSemanal.subBloques.map((e) => e.id),
          },
        },
      });
      await prisma.plantillaSemanal.delete({
        where: {
          id: foundPlantillaSemanal.id,
        },
      });
    });
  }

  public async getCountPlanificacionesAsignadasAlumno(infoEjecutor: {
    role: 'ADMIN' | 'ALUMNO';
    id: number;
  }) {
    return this.prisma.planificacionMensual.count({
      where: {
        asignacion: {
          alumnoId: infoEjecutor.id,
        },
      },
    });
  }

  public async assignDefaultPlanificationToAllAlumnos() {
    const alumnosSinPlanificacion = await this.prisma.usuario.findMany({
      where: {
        rol: 'ALUMNO',
        asignaciones: {
          none: {},
        },
      },
    });

    if (!alumnosSinPlanificacion || alumnosSinPlanificacion.length === 0) {
      console.log('No hay alumnos sin planificación asignada.');
      throw new BadRequestException(
        'No hay alumnos sin planificación asignada.',
      );
    }

    // Obtener todas las planificaciones mensuales por defecto disponibles
    const planificacionesPorDefecto = await firstValueFrom(
      forkJoin(
        Object.values(TipoDePlanificacionDeseada).map((tipo) => {
          return this.prisma.planificacionMensual.findFirst({
            where: {
              esPorDefecto: true,
              tipoDePlanificacion: tipo,
              asignada: false,
            },
          });
        }),
      ),
    );

    // Crear un mapa con las planificaciones disponibles por tipo
    const planificacionesMap = Object.values(TipoDePlanificacionDeseada).reduce(
      (map, tipo, index) => {
        map[tipo] = planificacionesPorDefecto[index] || null;
        return map;
      },
      {} as Record<TipoDePlanificacionDeseada, any>,
    );

    // Asignar la planificación a cada alumno basado en sus preferencias
    const resultados = [];
    for (const alumno of alumnosSinPlanificacion) {
      const tipoPreferido = alumno.tipoDePlanificacionDuracionDeseada;
      if (!tipoPreferido) {
        console.log(
          `El alumno con ID ${alumno.id} no tiene preferencia de planificación.`,
        );
        continue;
      }

      const planificacion = planificacionesMap[tipoPreferido];
      if (!planificacion) {
        console.log(
          `No se encontró planificación por defecto para el tipo ${tipoPreferido} (Alumno ID: ${alumno.id}).`,
        );
        continue;
      }

      // Asignar la planificación al alumno
      try {
        await this.asignarPlanificacionMensual(planificacion.id, [alumno.id]);
        resultados.push({
          alumnoId: alumno.id,
          planificacionId: planificacion.id,
          estado: 'asignado',
        });
      } catch (error) {
        console.error(
          `Error asignando planificación al alumno con ID ${alumno.id}:`,
          error,
        );
        resultados.push({
          alumnoId: alumno.id,
          planificacionId: planificacion.id,
          estado: 'error',
        });
      }
    }

    return resultados;
  }

  public async assignDefaultPlanificationToSpecificAlumno(
    userId: number,
    tipoDePlanificacion: TipoDePlanificacionDeseada,
  ) {
    //do the same as above but with specific id
    const foundUser = await this.prisma.usuario.findFirst({
      where: {
        id: userId,
      },
    });
    if (!foundUser) throw new BadRequestException('Usuario no existe!');
    if (!foundUser.tipoDePlanificacionDuracionDeseada)
      throw new BadRequestException(
        'El usuario no tiene un tipo de planificación seleccionada!',
      );
    const foundFirstDefaultPlanificacionMensualWithSpecificTimeframe =
      await this.prisma.planificacionMensual.findFirst({
        where: {
          asignada: false,
          tipoDePlanificacion:
            tipoDePlanificacion ?? foundUser.tipoDePlanificacionDuracionDeseada,
          esPorDefecto: true,
        },
      });
    if (!foundFirstDefaultPlanificacionMensualWithSpecificTimeframe)
      throw new BadRequestException(
        'No se encontró una planificación mensual por defecto con ese tipo de planificación!',
      );
    const res = await this.asignarPlanificacionMensual(
      foundFirstDefaultPlanificacionMensualWithSpecificTimeframe.id,
      [foundUser.id],
    );
    return res;
  }

  public async deletePlanificacionMensual(
    planificacionMensualId: number,
    infoEjecutor: { role: 'ADMIN' | 'ALUMNO'; id: number },
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      const whereAlumno = {
        id: Number(planificacionMensualId),
        asignacion: {
          alumnoId: infoEjecutor.id,
        },
      };
      const whereAdmin = {
        id: Number(planificacionMensualId),
      };
      const foundPLanificacionMensual =
        await prisma.planificacionMensual.findFirst({
          where: infoEjecutor.role == 'ADMIN' ? whereAdmin : whereAlumno,
          include: {
            subBloques: true,
            asignacion: true,
          },
        });
      if (!foundPLanificacionMensual)
        throw new BadRequestException('Esta planificación mensual no existe!');
      await prisma.subBloque.deleteMany({
        where: {
          id: {
            in: foundPLanificacionMensual.subBloques.map((e) => e.id),
          },
        },
      });
      await prisma.planificacionMensual.delete({
        where: {
          id: foundPLanificacionMensual.id,
        },
      });
    });
  }

  protected getModelName(): string {
    return 'planificacionBloque';
  }

  // Obtener todos los bloques con paginación
  public getAllBloques(dto: PaginationDto) {
    return this.getPaginatedData(
      dto,
      {
        identificador: {
          contains: dto.searchTerm ?? '',
          mode: 'insensitive',
        },
      },
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
    let ignorados = 0;
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
        ignorados++;
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
      ignoradas: ignorados,
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

  public getPlantillaSemanal(plantillaSemanalid: string) {
    return this.prisma.plantillaSemanal.findFirst({
      where: {
        id: Number(plantillaSemanalid),
      },
      include: {
        subBloques: true,
      },
    });
  }

  public getPlanificacionMensual(planificacionMensualId: string) {
    return this.prisma.planificacionMensual.findFirst({
      where: {
        id: Number(planificacionMensualId),
      },
      include: {
        subBloques: true,
        asignacion: true,
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
    return this.plantillaSemanal.getPaginatedData(
      dto,
      {
        identificador: {
          contains: dto.searchTerm ?? '',
          mode: 'insensitive',
        },
      },
      {},
    );
  }

  // Crear una nueva plantilla semanal con duplicación condicional de bloques
  public async createPlantillaSemanal(dto: CreateOrUpdatePlantillaSemanalDto) {
    const res = await this.prisma.$transaction(async (prisma) => {
      if (dto.id) {
        await this.deletePlantillaSemanal(Number(dto.id));
      }
      const plantillaSemanal = await prisma.plantillaSemanal.create({
        data: {
          identificador: dto.identificador,
          descripcion: dto.descripcion,
          subBloques: {
            create: dto.subBloques.map((sb) => ({
              horaInicio: sb.horaInicio,
              duracion: sb.duracion,
              nombre: sb.nombre,
              comentarios: sb.comentarios,
              color: sb.color,
            })),
          },
        },
      });
      return plantillaSemanal;
    });
    return res;
  }

  // Obtener todas las planificaciones mensuales con paginación
  public getAllPlanificacionesMensuales(dto: PaginationDto) {
    return this.planificacionMensual.getPaginatedData(
      dto,
      {
        ...(dto.where ?? {}),
        ...{
          OR: [
            {
              identificador: {
                contains: dto.searchTerm ?? '',
                mode: 'insensitive',
              },
            },
            {
              asignacion: {
                alumno: {
                  OR: [
                    {
                      email: {
                        contains: dto.searchTerm ?? '',
                        mode: 'insensitive',
                      },
                    },
                    {
                      nombre: {
                        contains: dto.searchTerm ?? '',
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        asignacion: {
          include: {
            alumno: true,
          },
        },
      },
    );
  }

  public getAllComentariosAlumnos(dto: PaginationDto) {
    return this.subbloqueService.getPaginatedData(
      dto,
      {
        AND: [
          { comentariosAlumno: { not: '' } }, // No vacío
          { comentariosAlumno: { not: null } }, // No nulo
          {
            planificacion: {
              asignacion: {
                alumno: {
                  OR: [
                    {
                      email: {
                        contains: dto.searchTerm ?? '',
                        mode: 'insensitive',
                      },
                    },
                    {
                      nombre: {
                        contains: dto.searchTerm ?? '',
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      {
        planificacion: {
          include: {
            asignacion: {
              include: {
                alumno: true,
              },
            },
          },
        },
      },
    );
  }

  public getAllPlanificacionesMensualesAlumno(
    dto: PaginationDto,
    idAlumno: number,
  ) {
    return this.planificacionMensual.getPaginatedData(
      dto,
      {
        identificador: {
          contains: dto.searchTerm ?? '',
          mode: 'insensitive',
        },
        asignacion: {
          alumnoId: idAlumno,
        },
      },
      {
        asignacion: true,
      },
    );
  }

  public async createOrUpdatePlanificacionMensual(
    dto: CreateOrUpdatePlanificacionMensualDto,
  ) {
    const res = await this.prisma.$transaction(async (prisma) => {
      if (dto.id) {
        // Planificación existente: Actualizar
        const planificacionExistente =
          await prisma.planificacionMensual.findUnique({
            where: { id: dto.id },
            include: { subBloques: true },
          });

        if (!planificacionExistente) {
          throw new Error(`Planificación con id ${dto.id} no encontrada.`);
        }

        
        // Eliminar sub-bloques no incluidos en el DTO
        const subBloquesIds = dto.subBloques
          .map((sb) => sb.id)
          .filter((id) => id);
        await prisma.subBloque.deleteMany({
          where: {
            planificacionId: dto.id,
            id: { notIn: subBloquesIds },
          },
        });

        // Actualizar o crear sub-bloques
        for (const subBloque of dto.subBloques) {
          if (subBloque.id) {
            // Actualizar sub-bloque existente
            await prisma.subBloque.update({
              where: { id: subBloque.id },
              data: {
                horaInicio: subBloque.horaInicio,
                duracion: subBloque.duracion,
                nombre: subBloque.nombre,
                comentarios: subBloque.comentarios,
                color: subBloque.color,
                comentariosAlumno: subBloque.comentariosAlumno ?? null,
                realizado: subBloque.realizado ?? false,
              },
            });
          } else {
            // Crear nuevo sub-bloque
            await prisma.subBloque.create({
              data: {
                horaInicio: subBloque.horaInicio,
                duracion: subBloque.duracion,
                nombre: subBloque.nombre,
                comentarios: subBloque.comentarios,
                color: subBloque.color,
                planificacionId: dto.id,
                comentariosAlumno: subBloque.comentariosAlumno ?? null,
                realizado: subBloque.realizado ?? false,
              },
            });
          }
        }

        // Actualizar la planificación
        const updatedPlanificacion = await prisma.planificacionMensual.update({
          where: { id: dto.id },
          data: {
            identificador: dto.identificador,
            descripcion: dto.descripcion,
            ano: dto.ano,
            mes: dto.mes,
            relevancia: dto.relevancia ?? [],
            esPorDefecto: dto.esPorDefecto ?? false,
            tipoDePlanificacion:
              dto.tipoDePlanificacion ?? TipoDePlanificacionDeseada.SEIS_HORAS,
          },
          include: {
            subBloques: true,
          },
        });

        return updatedPlanificacion;
      } else {
        // Planificación nueva: Crear
        const nuevaPlanificacion = await prisma.planificacionMensual.create({
          data: {
            identificador: dto.identificador,
            descripcion: dto.descripcion,
            ano: dto.ano,
            mes: dto.mes,
            relevancia: dto.relevancia ?? [],
            esPorDefecto: dto.esPorDefecto ?? false,
            tipoDePlanificacion:
              dto.tipoDePlanificacion ?? TipoDePlanificacionDeseada.SEIS_HORAS,
            subBloques: {
              create: dto.subBloques.map((sb) => ({
                horaInicio: sb.horaInicio,
                duracion: sb.duracion,
                nombre: sb.nombre,
                comentarios: sb.comentarios,
                color: sb.color,
              })),
            },
          },
        });
        return nuevaPlanificacion;
      }
    });

    return res;
  }

  public async asignarPlanificacionMensual(
    planificacionId: number,
    alumnosIds: number[],
  ): Promise<any> {
    return await this.prisma.$transaction(async (prisma) => {
      // Verifica si la planificación existe
      const planificacionOriginal =
        await prisma.planificacionMensual.findUnique({
          where: { id: planificacionId },
          include: { subBloques: true }, // Incluye los sub-bloques relacionados
        });

      if (!planificacionOriginal) {
        throw new BadRequestException('La planificación mensual no existe.');
      }

      if (alumnosIds.length == 0) {
        throw new BadRequestException('Debes seleccionar alumnos!');
      }

      // Procesa la asignación para cada alumno
      const nuevasPlanificaciones = await Promise.all(
        alumnosIds.map(async (alumnoId) => {
          let subBloquesClonados = [];
          if (planificacionOriginal.subBloques.length > 0) {
            subBloquesClonados = cloneDeep(planificacionOriginal.subBloques);
            subBloquesClonados = subBloquesClonados.map((subBloque) => ({
              horaInicio: subBloque.horaInicio,
              duracion: subBloque.duracion,
              nombre: subBloque.nombre,
              comentarios: subBloque.comentarios,
              color: subBloque.color,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
          }
          const nuevaPlanificacion = await prisma.planificacionMensual.create({
            data: {
              asignada: true,
              identificador: `${planificacionOriginal.identificador}-ALUMNO-${alumnoId}`,
              descripcion: planificacionOriginal.descripcion,
              mes: planificacionOriginal.mes,
              ano: planificacionOriginal.ano,
              createdAt: new Date(),
              updatedAt: new Date(),
              subBloques: {
                create: subBloquesClonados,
              },
            },
            include: {
              asignacion: true,
            },
          });

          await prisma.asignacionAlumno.create({
            data: {
              alumnoId,
              planificacionId: nuevaPlanificacion.id,
            },
          });

          return nuevaPlanificacion;
        }),
      );

      return {
        message:
          'Planificaciones personalizadas creadas y asignadas correctamente',
        planificacionOriginal: planificacionId,
        nuevasPlanificaciones: nuevasPlanificaciones.map((planificacion) => ({
          id: planificacion.id,
          alumnoId: planificacion.asignacion?.alumnoId || null,
        })),
      };
    });
  }
}
