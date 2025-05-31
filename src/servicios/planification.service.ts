import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PlanificacionBloque,
  PlanificacionMensual,
  PlantillaSemanal,
  SubBloque,
  TipoDePlanificacionDeseada,
} from '@prisma/client';
import { firstValueFrom, forkJoin } from 'rxjs';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  CreateBloqueDto,
  CreateOrUpdateEventoPersonalizadoDto,
  CreateOrUpdatePlanificacionMensualDto,
  CreateOrUpdatePlantillaSemanalDto,
  UpdateBloqueDto,
  UpdateEventoPersonalizadoRealizadoDto,
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
        asignaciones: {
          some: {
            alumnoId: infoEjecutor.id
          }
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
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      const foundPLanificacionMensual =
        await prisma.planificacionMensual.findFirst({
          where: {
            id: Number(planificacionMensualId),
          },
          include: {
            subBloques: true,
            asignaciones: true,
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
        asignaciones: true,
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

  public async clonarPlanificacionMensual(id: string) {
    return await this.prisma.$transaction(async (prisma) => {
      // Buscar la planificación mensual original con sus subBloques
      const planificacionOriginal =
        await prisma.planificacionMensual.findUnique({
          where: { id: Number(id) },
          include: { subBloques: true },
        });

      if (!planificacionOriginal) {
        throw new BadRequestException('La planificación mensual no existe.');
      }

      // Clonar los subBloques
      const subBloquesClonados = planificacionOriginal.subBloques.map(
        (subBloque) => ({
          horaInicio: subBloque.horaInicio,
          duracion: subBloque.duracion,
          nombre: subBloque.nombre,
          comentarios: subBloque.comentarios,
          color: subBloque.color,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      // Crear la nueva planificación con los subBloques clonados
      const nuevaPlanificacion = await prisma.planificacionMensual.create({
        data: {
          identificador: `${planificacionOriginal.identificador}-CLON`,
          descripcion: planificacionOriginal.descripcion,
          ano: planificacionOriginal.ano,
          mes: planificacionOriginal.mes,
          relevancia: planificacionOriginal.relevancia,
          esPorDefecto: false, // La nueva planificación no debería ser "por defecto"
          tipoDePlanificacion: planificacionOriginal.tipoDePlanificacion,
          subBloques: {
            create: subBloquesClonados,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        message: 'Planificación clonada con éxito.',
        originalId: id,
        nuevaPlanificacion,
      };
    });
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
              asignaciones: {
                some: {
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
      },
      {
        asignaciones: {
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
              asignaciones: {
                some: {
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
          },
        ],
      },
      {
        planificacion: {
          include: {
            asignaciones: {
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
        asignaciones: {
          some: {
            alumnoId: idAlumno
          }
        },
      },
      {
        asignaciones: {
          where: {
            alumnoId: idAlumno
          }
        },
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
                importante: subBloque.importante ?? false,
                tiempoAviso: subBloque.tiempoAviso ?? null,
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
                importante: subBloque.importante ?? false,
                tiempoAviso: subBloque.tiempoAviso ?? null,
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
                importante: sb.importante ?? false,
                tiempoAviso: sb.tiempoAviso ?? null,
              })),
            },
          },
        });
        return nuevaPlanificacion;
      }
    });

    return res;
  }

  // Método para obtener planificación mensual con el progreso del alumno
  public async getPlanificacionMensualConProgresoAlumno(
    planificacionId: number,
    alumnoId: number,
  ) {
    const planificacion = await this.prisma.planificacionMensual.findFirst({
      where: {
        id: Number(planificacionId),
        asignaciones: {
          some: {
            alumnoId
          }
        },
      },
      include: {
        subBloques: true,
        asignaciones: {
          where: {
            alumnoId
          }
        },
      },
    });

    if (!planificacion) {
      throw new BadRequestException(
        'Planificación no encontrada o no asignada a este alumno',
      );
    }

    // Obtener todos los progresos del alumno para esta planificación
    const progresos = await this.prisma.alumnoProgresoSubBloque.findMany({
      where: {
        asignacionAlumnoId: planificacionId,
        asignacionAlumnoAlumnoId: alumnoId
      },
    });

    // Obtener los eventos personalizados del alumno
    const eventosPersonalizados =
      await this.prisma.eventoPersonalizadoAlumno.findMany({
        where: {
          asignacionAlumnoId: planificacionId,
          asignacionAlumnoAlumnoId: alumnoId
        },
      });

    // Mapear cada subbloque con su progreso correspondiente
    const subBloquesConProgreso = planificacion.subBloques.map((subBloque) => {
      const progreso = progresos.find((p) => p.subBloqueId === subBloque.id);

      // Crear un objeto base con las propiedades originales del subBloque
      const subBloqueConProgreso = {
        ...subBloque,
        realizado: progreso?.realizado ?? subBloque.realizado,
        comentariosAlumno:
          progreso?.comentariosAlumno ?? subBloque.comentariosAlumno,
      } as any;

      // Solo añadir posicionPersonalizada si existe en el progreso
      if (progreso && progreso.posicionPersonalizada) {
        subBloqueConProgreso.posicionPersonalizada = progreso.posicionPersonalizada;
      }

      return subBloqueConProgreso;
    });

    return {
      ...planificacion,
      subBloques: subBloquesConProgreso,
      eventosPersonalizados: eventosPersonalizados,
    };
  }

  // Método para actualizar el progreso de un subbloque
  public async actualizarProgresoSubBloque(
    alumnoId: number,
    subBloqueId: number,
    planificacionId: number,
    datosActualizacion: {
      realizado?: boolean;
      comentariosAlumno?: string;
      posicionPersonalizada?: Date;
    },
  ) {
    // Encontrar el subbloque y verificar que pertenece a una planificación asignada al alumno
    const subBloque = await this.prisma.subBloque.findUnique({
      where: { id: subBloqueId, planificacionId: planificacionId },
      include: {
        planificacion: {
          include: {
            asignaciones: true,
          },
        },
      },
    });

    if (!subBloque || !subBloque.planificacion) {
      throw new BadRequestException(
        'El subbloque no existe o no forma parte de una planificación',
      );
    }

    // Verificar que la planificación está asignada al alumno
    const asignacion = await this.prisma.asignacionAlumno.findFirst({
      where: {
        alumnoId,
        planificacionId: planificacionId,
      },
    });

    if (!asignacion) {
      throw new BadRequestException(
        'Este subbloque no está en una planificación asignada a este alumno',
      );
    }

    // Buscar si ya existe un registro de progreso
    const progresoExistente =
      await this.prisma.alumnoProgresoSubBloque.findFirst({
        where: {
          asignacionAlumnoId: asignacion.planificacionId,
          asignacionAlumnoAlumnoId: alumnoId,
          subBloqueId,
        },
      });

    if (progresoExistente) {
      // Actualizar el progreso existente
      return this.prisma.alumnoProgresoSubBloque.update({
        where: { id: progresoExistente.id },
        data: datosActualizacion,
      });
    } else {
      // Crear un nuevo registro de progreso
      return this.prisma.alumnoProgresoSubBloque.create({
        data: {
          asignacionAlumnoId: asignacion.planificacionId,
          asignacionAlumnoAlumnoId: alumnoId,
          subBloqueId,
          ...datosActualizacion,
        },
      });
    }
  }

  // Método modificado para listar planificaciones mensuales de un alumno con su progreso
  public async getAllPlanificacionesMensualesAlumnoConProgreso(
    dto: PaginationDto,
    idAlumno: number,
  ) {
    const result = await this.planificacionMensual.getPaginatedData(
      dto,
      {
        identificador: {
          contains: dto.searchTerm ?? '',
          mode: 'insensitive',
        },
        asignaciones: {
          some: {
            alumnoId: idAlumno
          }
        },
      },
      {
        asignaciones: {
          where: {
            alumnoId: idAlumno
          }
        },
        subBloques: true,
      },
    );

    // Para cada planificación, obtener el progreso del alumno
    const planificaciones = [...result.data] as PlanificacionMensual[];

    if (planificaciones.length > 0) {
      // Obtener todos los progresos del alumno para estas planificaciones
      const planificacionesIds = planificaciones.map((p) => p.id);

      const progresos = await this.prisma.alumnoProgresoSubBloque.findMany({
        where: {
          asignacionAlumnoId: {
            in: planificacionesIds,
          },
          asignacionAlumnoAlumnoId: idAlumno
        },
      });

      // Agrupar los progresos por planificacionId para acceso más rápido
      const progresosPorPlanificacion = {};
      for (const progreso of progresos) {
        if (!progresosPorPlanificacion[progreso.asignacionAlumnoId]) {
          progresosPorPlanificacion[progreso.asignacionAlumnoId] = [];
        }
        progresosPorPlanificacion[progreso.asignacionAlumnoId].push(progreso);
      }

      // Combinar la información de progreso con cada planificación
      for (let i = 0; i < planificaciones.length; i++) {
        const planificacion = planificaciones[i];
        const progresosPlanificacion =
          progresosPorPlanificacion[planificacion.id] || [];

        // Actualizar cada subbloque con su progreso correspondiente
        const subBloquesConProgreso = (planificacion as any).subBloques.map(
          (subBloque) => {
            const progreso = progresosPlanificacion.find(
              (p) => p.subBloqueId === subBloque.id,
            );

            return {
              ...subBloque,
              realizado: progreso?.realizado ?? subBloque.realizado,
              comentariosAlumno:
                progreso?.comentariosAlumno ?? subBloque.comentariosAlumno,
              posicionPersonalizada: progreso?.posicionPersonalizada ?? null,
            };
          },
        );

        planificaciones[i] = {
          ...planificacion,
          subBloques: subBloquesConProgreso,
        } as any;
      }
    }

    return {
      ...result,
      data: planificaciones,
    };
  }

  // Método modificado para asignar planificaciones a alumnos utilizando AlumnoProgresoSubBloque
  public async asignarPlanificacionMensual(
    planificacionId: number,
    alumnosIds: number[],
  ): Promise<any> {
    return await this.prisma.$transaction(async (prisma) => {
      // Verifica si la planificación existe
      const planificacion = await prisma.planificacionMensual.findUnique({
        where: { id: planificacionId },
        include: { subBloques: true },
      });

      if (!planificacion) {
        throw new BadRequestException('La planificación mensual no existe.');
      }

      if (alumnosIds.length === 0) {
        throw new BadRequestException('Debes seleccionar alumnos!');
      }

      // Crear nuevas planificaciones y asignaciones para cada alumno
      const asignaciones = [];

      for (const alumnoId of alumnosIds) {
        // Verificar que el alumno no tenga ya asignada esta planificación
        const asignacionExistente = await prisma.asignacionAlumno.findFirst({
          where: {
            alumnoId,
            planificacionId: planificacion.id,
          },
        });

        if (asignacionExistente) {
          asignaciones.push({
            alumnoId,
            planificacionId: planificacion.id,
            estado: 'ya_asignada',
          });
          continue;
        }

        // Crear asignación
        await prisma.asignacionAlumno.create({
          data: {
            alumnoId,
            planificacionId: planificacion.id,
          },
        });

        // Crear registros iniciales de progreso para cada subbloque
        for (const subBloque of planificacion.subBloques) {
          await prisma.alumnoProgresoSubBloque.create({
            data: {
              asignacionAlumnoId: planificacion.id,
              asignacionAlumnoAlumnoId: alumnoId,
              subBloqueId: subBloque.id,
              realizado: false,
            },
          });
        }

        asignaciones.push({
          alumnoId,
          planificacionId: planificacion.id,
          estado: 'asignada',
        });
      }

      // Marcar la planificación como asignada
      await prisma.planificacionMensual.update({
        where: { id: planificacion.id },
        data: { asignada: true },
      });

      return {
        message: 'Planificaciones asignadas correctamente',
        planificacionId: planificacion.id,
        asignaciones,
      };
    });
  }

  // Método para obtener eventos personalizados de un alumno para una planificación
  public async getEventosPersonalizadosAlumno(
    planificacionId: number,
    alumnoId: number,
  ) {
    // Verificar que la planificación está asignada al alumno
    const asignacion = await this.prisma.asignacionAlumno.findFirst({
      where: {
        alumnoId,
        planificacionId,
      },
    });

    if (!asignacion) {
      throw new BadRequestException(
        'La planificación no está asignada a este alumno',
      );
    }

    // Obtener los eventos personalizados del alumno específico
    return this.prisma.eventoPersonalizadoAlumno.findMany({
      where: {
        asignacionAlumnoId: planificacionId,
        asignacionAlumnoAlumnoId: alumnoId,
      },
    });
  }

  // Método para crear un evento personalizado
  public async crearEventoPersonalizadoAlumno(
    alumnoId: number,
    dto: CreateOrUpdateEventoPersonalizadoDto,
  ) {
    // Verificar que la planificación existe y está asignada al alumno
    const asignacion = await this.prisma.asignacionAlumno.findFirst({
      where: {
        alumnoId,
        planificacionId: dto.planificacionId,
      },
    });

    if (!asignacion) {
      throw new BadRequestException(
        'La planificación no está asignada a este alumno',
      );
    }

    // Crear el evento personalizado
    return this.prisma.eventoPersonalizadoAlumno.create({
      data: {
        asignacionAlumnoId: dto.planificacionId,
        asignacionAlumnoAlumnoId: alumnoId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        horaInicio: dto.horaInicio,
        duracion: dto.duracion,
        color: dto.color,
        importante: dto.importante ?? false,
        tiempoAviso: dto.tiempoAviso,
      },
    });
  }

  // Método para actualizar un evento personalizado
  public async actualizarEventoPersonalizadoAlumno(
    alumnoId: number,
    dto: CreateOrUpdateEventoPersonalizadoDto,
  ) {
    if (!dto.id) {
      throw new BadRequestException(
        'El ID del evento es requerido para actualizarlo',
      );
    }

    // Verificar que el evento existe y pertenece al alumno
    const evento = await this.prisma.eventoPersonalizadoAlumno.findUnique({
      where: { id: dto.id },
      include: {
        asignacion: true,
      },
    });

    if (!evento) {
      throw new BadRequestException('El evento no existe');
    }

    if (evento.asignacion.alumnoId !== alumnoId) {
      throw new BadRequestException(
        'No tienes permiso para editar este evento',
      );
    }

    // Actualizar el evento
    return this.prisma.eventoPersonalizadoAlumno.update({
      where: { id: dto.id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        horaInicio: dto.horaInicio,
        duracion: dto.duracion,
        color: dto.color,
        importante: dto.importante ?? false,
        tiempoAviso: dto.tiempoAviso,
      },
    });
  }

  // Método para eliminar un evento personalizado
  public async eliminarEventoPersonalizadoAlumno(
    alumnoId: number,
    eventoId: number,
  ) {
    // Verificar que el evento existe y pertenece al alumno
    const evento = await this.prisma.eventoPersonalizadoAlumno.findUnique({
      where: { id: eventoId },
      include: {
        asignacion: true,
      },
    });

    if (!evento) {
      throw new BadRequestException('El evento no existe');
    }

    if (evento.asignacion.alumnoId !== alumnoId) {
      throw new BadRequestException(
        'No tienes permiso para eliminar este evento',
      );
    }

    // Eliminar el evento
    return this.prisma.eventoPersonalizadoAlumno.delete({
      where: { id: eventoId },
    });
  }

  // En el servicio planification.service.ts del backend
  async actualizarEventoPersonalizadoRealizado(
    alumnoId: number,
    dto: UpdateEventoPersonalizadoRealizadoDto,
  ) {
    // Verificamos primero que la asignación existe para ese alumno
    const asignacion = await this.prisma.asignacionAlumno.findFirst({
      where: {
        alumnoId: alumnoId,
        planificacionId: dto.planificacionId,
      },
    });

    if (!asignacion) {
      throw new BadRequestException(
        'La planificación no está asignada a este alumno',
      );
    }

    // Verificar que el evento pertenece al alumno
    const eventoExistente = await this.prisma.eventoPersonalizadoAlumno.findFirst({
      where: {
        id: dto.id,
        asignacionAlumnoId: asignacion.planificacionId,
      },
    });

    if (!eventoExistente) {
      throw new BadRequestException(
        'El evento no existe o no pertenece al alumno',
      );
    }

    // Actualizar solo el campo realizado
    return this.prisma.eventoPersonalizadoAlumno.update({
      where: { id: dto.id },
      data: { realizado: dto.realizado },
    });
  }

  /**
   * Permite a un alumno desvincular una planificación mensual asignada,
   * eliminando todo su progreso asociado.
   * @param alumnoId ID del alumno que desea desvincular la planificación
   * @param planificacionId ID de la planificación a desvincular
   * @returns Mensaje de confirmación
   */
  public async desvincularPlanificacionMensual(
    alumnoId: number,
    planificacionId: number,
  ): Promise<any> {
    return await this.prisma.$transaction(async (prisma) => {
      // Verificar que existe la asignación
      const asignacionExistente = await prisma.asignacionAlumno.findFirst({
        where: {
          alumnoId,
          planificacionId,
        },
      });

      if (!asignacionExistente) {
        throw new BadRequestException('No tienes esta planificación asignada.');
      }

      // Eliminar todos los progresos de subbloques asociados
      await prisma.alumnoProgresoSubBloque.deleteMany({
        where: {
          asignacionAlumnoAlumnoId: alumnoId,
          asignacionAlumnoId: planificacionId,
        },
      });

      // Eliminar todos los eventos personalizados asociados
      await prisma.eventoPersonalizadoAlumno.deleteMany({
        where: {
          asignacionAlumnoAlumnoId: alumnoId,
          asignacionAlumnoId: planificacionId,
        },
      });

      // Eliminar la asignación
      await prisma.asignacionAlumno.delete({
        where: {
          alumnoId_planificacionId: {
            alumnoId,
            planificacionId,
          },
        },
      });

      // Verificar si quedan asignaciones para esta planificación
      const asignacionesRestantes = await prisma.asignacionAlumno.count({
        where: {
          planificacionId,
        },
      });

      // Si no quedan asignaciones, marcar la planificación como no asignada
      if (asignacionesRestantes === 0) {
        await prisma.planificacionMensual.update({
          where: { id: planificacionId },
          data: { asignada: false },
        });
      }

      return {
        message: 'Planificación desvinculada correctamente',
        planificacionId,
        alumnoId,
      };
    });
  }
}
