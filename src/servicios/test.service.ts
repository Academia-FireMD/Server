import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Comunidad,
  Dificultad,
  FactorName,
  Pregunta,
  Respuesta,
  SeguridadAlResponder,
  TestStatus,
} from '@prisma/client';
import { NewTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { RegistrarRespuestaDto } from 'src/dtos/registrar-respuesta.dto';
import { PaginatedResult, PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class RespuestaPaginatedService extends PaginatedService<Respuesta> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'respuesta';
  }

  public async getPaginatedData(
    dto: PaginationDto,
    where: object = {},
    include: object = {},
  ): Promise<PaginatedResult<Respuesta>> {
    // Obtener el número total de respuestas incorrectas que coinciden con el filtro
    const count = await this.prisma.respuesta.count({
      where,
    });
    // Obtener los datos paginados sin agrupar
    const data = await this.prisma.respuesta.findMany({
      where,
      take: dto.take,
      skip: dto.skip,
      include,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data,
      pagination: {
        ...dto,
        count, // Contar el número total de respuestas incorrectas
      },
    };
  }
}

@Injectable()
export class TestService {
  constructor(
    protected prisma: PrismaService,
    private paginatedService: RespuestaPaginatedService,
  ) {}

  public async obtainTestStats(userId: number, testId: number) {
    const foundTest = await this.prisma.test.findMany({
      where: {
        id: testId,
        realizadorId: userId,
        status: 'FINALIZADO',
      },
    });
    if (!foundTest) throw new BadRequestException('El test no existe!');
    const stats = await this.prisma.respuesta.groupBy({
      by: ['seguridad', 'esCorrecta'],
      where: {
        testId: testId,
      },
      _count: {
        esCorrecta: true,
      },
    });

    const seguridadMap = {
      CINCUENTA_POR_CIENTO: { correctas: 0, incorrectas: 0 },
      SETENTA_Y_CINCO_POR_CIENTO: { correctas: 0, incorrectas: 0 },
      CIEN_POR_CIENTO: { correctas: 0, incorrectas: 0 },
    };

    stats.forEach((stat) => {
      const key = stat.seguridad as keyof typeof seguridadMap;
      if (stat.esCorrecta) {
        seguridadMap[key].correctas = stat._count.esCorrecta;
      } else {
        seguridadMap[key].incorrectas = stat._count.esCorrecta;
      }
    });

    return {
      seguridad: seguridadMap,
    };
  }

  public obtenerFallosCount(userId: number) {
    return this.prisma.respuesta.count({
      where: {
        AND: [
          {
            test: {
              realizadorId: userId,
            },
          },
          {
            esCorrecta: false,
          },
        ],
      },
    });
  }

  public obtenerFallos(userId: number, dto: PaginationDto) {
    return this.paginatedService.getPaginatedData(
      dto,
      {
        AND: [
          {
            test: {
              realizadorId: userId,
            },
          },
          {
            esCorrecta: false,
          },
        ],
      },
      {
        pregunta: true,
      },
    );
  }

  public async getTestById(testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        respuestas: true,
        testPreguntas: {
          include: {
            pregunta: {
              select: {
                id: true,
                identificador: true,
                dificultad: true,
                descripcion: true,
                solucion: true,
                respuestas: true,
                seguridad: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      throw new BadRequestException('Test no encontrado.');
    }

    return {
      id: test.id,
      realizadorId: test.realizadorId,
      status: test.status,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
      respuestasCount: test.respuestas.length,
      preguntas: test.testPreguntas.map((tp) => tp.pregunta),
    };
  }

  public async getFinishedTestsByUserId(userId: number) {
    const tests = await this.prisma.test.findMany({
      where: {
        realizadorId: userId,
        status: 'FINALIZADO',
      },
      include: {
        respuestas: true,
        testPreguntas: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return tests;
  }

  public async getPendingTestsByUserId(userId: number) {
    const tests = await this.prisma.test.findMany({
      where: {
        realizadorId: userId,
        OR: [{ status: 'CREADO' }, { status: 'EMPEZADO' }],
      },
      include: {
        respuestas: true,
        testPreguntas: true,
      },
    });

    return tests.map((test) => ({
      ...test,
      respuestasCount: test.respuestas.length,
      testPreguntasCount: test.testPreguntas.length,
    }));
  }

  public async registrarRespuesta(
    dto: RegistrarRespuestaDto,
    usuarioId: number,
  ) {
    const pregunta = await this.prisma.pregunta.findUnique({
      where: { id: dto.preguntaId },
    });

    const esCorrecta = pregunta.respuestaCorrectaIndex === dto.respuestaDada;

    const respuesta = await this.prisma.respuesta.create({
      data: {
        testId: dto.testId,
        preguntaId: dto.preguntaId,
        respuestaDada: dto.respuestaDada,
        esCorrecta: esCorrecta,
        seguridad: dto.seguridad ?? SeguridadAlResponder.CIEN_POR_CIENTO,
      },
      include: {
        pregunta: {
          select: {
            respuestaCorrectaIndex: true,
          },
        },
      },
    });

    const factorPivot = await this.prisma.factor.findUnique({
      where: { id: FactorName.PREGUNTAS_MALAS_PIVOT },
    });

    const ultimasRespuestas = await this.prisma.respuesta.findMany({
      where: {
        test: {
          realizadorId: usuarioId,
        },
        preguntaId: dto.preguntaId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: factorPivot.value ?? 5,
    });

    const todasCorrectas = ultimasRespuestas.every(
      (respuesta) => respuesta.esCorrecta,
    );

    if (todasCorrectas && ultimasRespuestas.length === factorPivot.value) {
      // Eliminar las respuestas incorrectas de esta pregunta si todas las últimas N fueron correctas
      await this.prisma.respuesta.deleteMany({
        where: {
          test: {
            realizadorId: usuarioId,
          },
          preguntaId: dto.preguntaId,
          esCorrecta: false,
        },
      });
    }

    const foundCreatedTest = await this.prisma.test.findFirst({
      where: {
        id: dto.testId,
        status: 'CREADO',
      },
    });
    if (!!foundCreatedTest) {
      await this.prisma.test.update({
        where: {
          id: dto.testId,
        },
        data: {
          status: 'EMPEZADO',
        },
      });
    }

    const totalPreguntas = await this.prisma.testPregunta.count({
      where: {
        testId: dto.testId,
      },
    });

    const totalRespuestas = await this.prisma.respuesta.count({
      where: {
        testId: dto.testId,
      },
    });

    const testCompletado = totalRespuestas === totalPreguntas;
    if (!!testCompletado) {
      await this.prisma.test.update({
        where: {
          id: dto.testId,
        },
        data: {
          status: 'FINALIZADO',
        },
      });
    }

    return respuesta;
  }

  public async deleteTest(userId: number, testId: number) {
    const foundTest = await this.prisma.test.findFirst({
      where: {
        id: testId,
        realizadorId: userId,
      },
    });
    if (!foundTest) throw new BadRequestException('Test no encontrado!');
    return this.prisma.test.delete({
      where: {
        id: testId,
      },
    });
  }

  public async startTest(
    userId: number,
    dto: NewTestDto,
    userComunidad: Comunidad,
  ) {
    // Verificar si el usuario tiene tests en progreso o creados
    const testEnProgreso = await this.prisma.test.findFirst({
      where: {
        realizadorId: userId,
        status: { in: [TestStatus.CREADO, TestStatus.EMPEZADO] },
      },
    });

    if (testEnProgreso) {
      throw new BadRequestException('Tienes algún test ya empezado o creado!');
    }

    let preguntasDisponibles: Pregunta[];

    if (dto.generarTestDeRepaso) {
      // Obtener preguntas donde el usuario ha fallado
      const fallos = await this.prisma.respuesta.findMany({
        where: {
          test: {
            realizadorId: userId,
            status: 'FINALIZADO',
          },
          esCorrecta: false,
        },
        include: {
          pregunta: true,
        },
      });

      if (fallos.length === 0) {
        throw new BadRequestException(
          'No tienes preguntas falladas para generar un test de repaso.',
        );
      }

      // Extraer las preguntas falladas
      preguntasDisponibles = fallos.map((fallo) => fallo.pregunta);

      // Si hay más preguntas solicitadas de las disponibles, repetir las preguntas
      if (preguntasDisponibles.length < dto.numPreguntas) {
        const faltantes = dto.numPreguntas - preguntasDisponibles.length;
        for (let i = 0; i < faltantes; i++) {
          const preguntaRepetida =
            preguntasDisponibles[i % preguntasDisponibles.length];
          preguntasDisponibles.push(preguntaRepetida);
        }
      }
    } else {
      // Obtener preguntas disponibles según los filtros normales
      preguntasDisponibles = await this.prisma.pregunta.findMany({
        where: {
          // TODO tema: { in: dto.temas },
          relevancia: {
            has: userComunidad,
          },
        },
      });

      if (preguntasDisponibles.length === 0) {
        throw new BadRequestException(
          'No hay preguntas disponibles para los temas seleccionados.',
        );
      }

      // Seleccionar preguntas según la dificultad y cantidad solicitada
      preguntasDisponibles = this.seleccionarPreguntasPorDificultad(
        preguntasDisponibles,
        dto.numPreguntas,
        dto.dificultad,
      );
    }

    // Crear el test en la base de datos
    const test = await this.prisma.test.create({
      data: {
        realizadorId: userId,
        status: TestStatus.CREADO,
      },
    });

    // Crear las entradas en TestPregunta
    const testPreguntasData = preguntasDisponibles
      .slice(0, dto.numPreguntas)
      .map((pregunta) => ({
        testId: test.id,
        preguntaId: pregunta.id,
      }));

    await this.prisma.testPregunta.createMany({
      data: testPreguntasData,
    });

    // Recuperar el test con las preguntas asociadas
    const testConPreguntas = await this.getTestById(test.id);

    return testConPreguntas;
  }

  private seleccionarPreguntasPorDificultad(
    preguntas: Pregunta[],
    numPreguntas: number,
    dificultadSolicitada: Dificultad,
  ): Pregunta[] {
    const distribucion =
      this.obtenerDistribucionDificultad(dificultadSolicitada);

    const preguntasPorDificultad = {
      DIFICIL: preguntas.filter((p) => p.dificultad === Dificultad.DIFICIL),
      INTERMEDIO: preguntas.filter(
        (p) => p.dificultad === Dificultad.INTERMEDIO,
      ),
      BASICO: preguntas.filter((p) => p.dificultad === Dificultad.BASICO),
    };

    const seleccionadas: Pregunta[] = [];

    const seleccionarConRepeticion = (
      listaPreguntas: Pregunta[],
      cantidad: number,
    ): Pregunta[] => {
      const resultado: Pregunta[] = [];
      for (let i = 0; i < cantidad; i++) {
        const indice = Math.floor(Math.random() * listaPreguntas.length);
        resultado.push(listaPreguntas[indice]);
      }
      return resultado;
    };

    seleccionadas.push(
      ...seleccionarConRepeticion(
        preguntasPorDificultad.DIFICIL,
        Math.round(distribucion.dificil * numPreguntas),
      ),
    );

    seleccionadas.push(
      ...seleccionarConRepeticion(
        preguntasPorDificultad.INTERMEDIO,
        Math.round(distribucion.intermedio * numPreguntas),
      ),
    );

    seleccionadas.push(
      ...seleccionarConRepeticion(
        preguntasPorDificultad.BASICO,
        Math.round(distribucion.facil * numPreguntas),
      ),
    );

    while (seleccionadas.length < numPreguntas) {
      const indice = Math.floor(Math.random() * preguntas.length);
      seleccionadas.push(preguntas[indice]);
    }

    return seleccionadas.slice(0, numPreguntas);
  }

  private obtenerDistribucionDificultad(dificultad: Dificultad) {
    switch (dificultad) {
      case Dificultad.DIFICIL:
        return { dificil: 0.6, intermedio: 0.3, facil: 0.1 };
      case Dificultad.INTERMEDIO:
        return { dificil: 0.3, intermedio: 0.5, facil: 0.2 };
      case Dificultad.BASICO:
      default:
        return { dificil: 0.1, intermedio: 0.3, facil: 0.6 };
    }
  }
}
