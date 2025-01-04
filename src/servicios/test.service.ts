import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Comunidad,
  Dificultad,
  FactorName,
  Pregunta,
  Respuesta,
  SeguridadAlResponder,
  Tema,
  Test,
  TestPregunta,
  TestStatus,
} from '@prisma/client';
import { firstValueFrom, from, map, mergeMap, of, toArray } from 'rxjs';
import { NewTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { DateRangeDto } from 'src/dtos/range.dto';
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
export class TestService extends PaginatedService<Test> {
  private includeQuery = {
    realizador: true,
    testPreguntas: {
      include: {
        pregunta: {
          include: {
            tema: true,
          },
        },
      },
    },
  };

  constructor(
    protected prisma: PrismaService,
    private paginatedService: RespuestaPaginatedService,
  ) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'test';
  }

  public getAllTestsAlumno(dto: PaginationDto, userId: number) {
    return from(
      this.getPaginatedData(
        dto,
        {
          realizadorId: userId,
          status: TestStatus.FINALIZADO,
          realizador: {
            email: {
              contains: dto.searchTerm ?? '',
              mode: 'insensitive',
            },
          },
          ...dto.where,
        },
        this.includeQuery,
      ),
    ).pipe(
      mergeMap((res) => {
        if (res.data.length == 0) return of(res);
        return from(res.data).pipe(
          mergeMap(
            (entry) =>
              from(this.obtainTestStats(userId, entry.id)).pipe(
                map((stats) => ({
                  ...entry,
                  stats,
                })),
              ),
            5, // Limita la concurrencia a 5 peticiones simultáneas
          ),
          toArray(),
          map((dataWithStats) => ({
            data: dataWithStats,
            pagination: res.pagination,
          })),
        );
      }),
    );
  }

  public getAllTestsAdmin(dto: PaginationDto) {
    return from(
      this.getPaginatedData(
        dto,
        {
          ...dto.where,
          status: TestStatus.FINALIZADO,
          realizador: {
            email: {
              contains: dto.searchTerm ?? '',
              mode: 'insensitive',
            },
          },
        },
        this.includeQuery,
      ),
    ).pipe(
      mergeMap((res) => {
        if (res.data.length == 0) return of(res);
        return from(this.addStatToTests(res.data)).pipe(
          map((dataWithStats) => ({
            data: dataWithStats,
            pagination: res.pagination,
          })),
        );
      }),
    );
  }

  async getTestStatsByCategory(dto: DateRangeDto, realizadorId?: number) {
    const where = {
      createdAt: {
        gte: dto.from,
        lte: dto.to,
      },
      status: TestStatus.FINALIZADO,
    } as any;
    where['realizadorId'] = realizadorId;
    const tests = await this.prisma.test.findMany({
      where,
      include: {
        testPreguntas: {
          include: {
            pregunta: {
              include: {
                tema: true,
              },
            },
          },
        },
      },
    });
    if (tests.length == 0) {
      return {};
    }
    const testWithStats = await this.addStatToTests(tests);
    const groupedStats = this.groupTestsByCategory(testWithStats as any);
    return groupedStats;
  }

  private async addStatToTests(tests: Array<Test>) {
    const res = [];
    for (let test of tests) {
      test = await firstValueFrom(
        from(this.obtainTestStats(test.realizadorId, test.id)).pipe(
          map((stats) => ({
            ...test,
            stats,
          })),
        ),
      );
      res.push(test);
    }
    return res;
  }

  groupTestsByCategory(
    tests: (Test & {
      testPreguntas: (TestPregunta & { pregunta: Pregunta & { tema: Tema } })[];
    })[],
  ) {
    const groupedTests = {
      mixto: [] as Test[],
    };

    for (const test of tests) {
      const categorias = new Set<string>();

      for (const testPregunta of test.testPreguntas) {
        const categoria = testPregunta.pregunta.tema.categoria;
        categorias.add(categoria); // Añadimos la categoría al Set
      }

      if (categorias.size > 1) {
        groupedTests.mixto.push(test); // Si tiene varias categorías, lo asignamos a 'mixto'
      } else {
        const categoria = Array.from(categorias)[0]; // Obtenemos la única categoría

        if (!groupedTests[categoria]) {
          groupedTests[categoria] = [];
        }

        groupedTests[categoria].push(test);
      }
    }

    return groupedTests;
  }

  public async obtainTestStats(
    userId: number,
    testId: number,
    isAdmin = false,
  ) {
    const where = {
      id: testId,
    };
    if (!isAdmin) where['realizadorId'] = userId;
    const foundTest = await this.prisma.test.findFirst({
      where,
      include: {
        testPreguntas: {
          include: {
            pregunta: true,
          },
        },
      },
    });
    if (!foundTest) {
      throw new BadRequestException('El test no existe!');
    }

    if (foundTest.status != TestStatus.FINALIZADO) {
      throw new BadRequestException('El test no está terminado todavia!');
    }

    // Obtener las estadísticas agrupadas por seguridad y esCorrecta (correctas/incorrectas)
    const stats = await this.prisma.respuesta.groupBy({
      by: ['seguridad', 'esCorrecta'],
      where: {
        testId: testId,
        estado: 'RESPONDIDA', // Filtrar solo respuestas respondidas (correctas e incorrectas)
      },
      _count: {
        esCorrecta: true,
      },
    });

    // Crear un mapa para la seguridad con las estadísticas de respuestas
    const seguridadMap = {
      CINCUENTA_POR_CIENTO: { correctas: 0, incorrectas: 0, noRespondidas: 0 },
      SETENTA_Y_CINCO_POR_CIENTO: {
        correctas: 0,
        incorrectas: 0,
        noRespondidas: 0,
      },
      CIEN_POR_CIENTO: { correctas: 0, incorrectas: 0, noRespondidas: 0 },
    };

    // Procesar las estadísticas de las respuestas (solo correctas e incorrectas)
    stats.forEach((stat) => {
      const key = stat.seguridad as keyof typeof seguridadMap;
      if (stat.esCorrecta) {
        seguridadMap[key].correctas = stat._count.esCorrecta;
      } else {
        seguridadMap[key].incorrectas = stat._count.esCorrecta;
      }
    });

    // Obtener el conteo de respuestas omitidas o no respondidas por seguridad
    const respuestasOmitidasONoRespondidas =
      await this.prisma.respuesta.findMany({
        where: {
          testId: testId,
          estado: { in: ['OMITIDA', 'NO_RESPONDIDA'] }, // Solo omitidas o no respondidas
        },
        select: {
          preguntaId: true,
          estado: true,
          pregunta: {
            select: {
              seguridad: true,
            },
          },
        },
      });

    // Actualizar el mapa de seguridad con las respuestas omitidas o no respondidas
    respuestasOmitidasONoRespondidas.forEach((respuesta) => {
      const seguridad = respuesta.pregunta.seguridad || 'CIEN_POR_CIENTO';
      seguridadMap[seguridad as keyof typeof seguridadMap].noRespondidas++;
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

  private examenTestHasExpired(test: Test) {
    return test.endsAt && new Date() > test.endsAt;
  }

  public async getTestById(testId: number) {
    const test = await this.prisma.test.findFirst({
      where: { id: testId },
      include: {
        respuestas: {
          select: {
            id: true,
            respuestaDada: true,
            esCorrecta: true,
            estado: true, // Incluir el estado de la respuesta
          },
        },
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
                tema: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      throw new BadRequestException('Test no encontrado.');
    }

    if (this.examenTestHasExpired(test)) {
      await this.prisma.test.update({
        where: { id: testId },
        data: {
          status: TestStatus.FINALIZADO,
        },
      });
      test.status = TestStatus.FINALIZADO;
    }

    return {
      id: test.id,
      realizadorId: test.realizadorId,
      status: test.status,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
      duration: test.duration,
      endsAt: test.endsAt,
      respuestasCount: test.respuestas.length,
      preguntas: test.testPreguntas.map((tp) => tp.pregunta),
      respuestas: test.respuestas,
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

    const updatedTests = await Promise.all(
      tests.map(async (test) => {
        if (this.examenTestHasExpired(test)) {
          await this.prisma.test.update({
            where: { id: test.id },
            data: {
              status: TestStatus.FINALIZADO,
            },
          });
          return { ...test, status: TestStatus.FINALIZADO };
        }
        return test;
      }),
    );

    return updatedTests
      .filter((test) => test.status != 'FINALIZADO')
      .map((test) => ({
        ...test,
        respuestasCount: test.respuestas.length,
        testPreguntasCount: test.testPreguntas.length,
      }));
  }

  public async registrarRespuesta(
    dto: RegistrarRespuestaDto,
    usuarioId: number,
  ) {
    const test = await this.prisma.test.findUnique({
      where: { id: dto.testId },
    });

    if (this.examenTestHasExpired(test)) {
      await this.prisma.test.update({
        where: { id: dto.testId },
        data: {
          status: 'FINALIZADO',
        },
      });
      throw new BadRequestException('El tiempo del examen ha expirado.');
    }
    if (test.status == 'CREADO') {
      await this.prisma.test.update({
        where: {
          id: dto.testId,
        },
        data: {
          status: 'EMPEZADO',
        },
      });
    }

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
        estado: dto.omitida ? 'OMITIDA' : 'RESPONDIDA', // Estado dependiendo de si se omitió o no
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

    // Aplicar lógica del factor
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
            id: {
              not: dto.testId,
            },
          },
          preguntaId: dto.preguntaId,
          esCorrecta: false,
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
    if (testCompletado) {
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
    const test = await this.prisma.$transaction(async (prisma) => {
      // Verificar si el usuario tiene tests en progreso o creados
      const testEnProgreso = await prisma.test.findFirst({
        where: {
          realizadorId: userId,
          status: { in: [TestStatus.CREADO, TestStatus.EMPEZADO] },
        },
      });

      if (testEnProgreso) {
        throw new BadRequestException(
          'Tienes algún test ya empezado o creado!',
        );
      }

      let preguntasDisponibles: Pregunta[];

      if (dto.generarTestDeRepaso) {
        // Obtener preguntas donde el usuario ha fallado
        const fallos = await prisma.respuesta.findMany({
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
      } else {
        // Obtener preguntas disponibles según los filtros normales
        preguntasDisponibles = await prisma.pregunta.findMany({
          where: {
            temaId: { in: dto.temas },
            createdById:
              dto.dificultad == Dificultad.PRIVADAS ? userId : undefined,
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
      const test = await prisma.test.create({
        data: {
          realizadorId: userId,
          status: TestStatus.CREADO,
          duration: dto.duracion,
          esDeRepaso: dto.generarTestDeRepaso ?? false,
          endsAt: dto.duracion
            ? new Date(Date.now() + dto.duracion * 60000)
            : null,
        },
      });

      // Crear las entradas en TestPregunta
      const testPreguntasData = preguntasDisponibles
        .slice(0, dto.numPreguntas)
        .map((pregunta) => ({
          testId: test.id,
          preguntaId: pregunta.id,
        }));

      await prisma.testPregunta.createMany({
        data: testPreguntasData,
      });
      return test;
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
      [Dificultad.DIFICIL]: preguntas.filter(
        (p) => p.dificultad === Dificultad.DIFICIL,
      ),
      [Dificultad.INTERMEDIO]: preguntas.filter(
        (p) => p.dificultad === Dificultad.INTERMEDIO,
      ),
      [Dificultad.BASICO]: preguntas.filter(
        (p) => p.dificultad === Dificultad.BASICO,
      ),
      [Dificultad.PRIVADAS]: preguntas.filter(
        (p) =>
          p.dificultad === Dificultad.PRIVADAS ||
          p.dificultad == Dificultad.PUBLICAS,
      ),
      [Dificultad.PUBLICAS]: preguntas.filter(
        (p) => p.dificultad === Dificultad.PUBLICAS,
      ),
    };

    if (
      dificultadSolicitada === Dificultad.PRIVADAS ||
      dificultadSolicitada === Dificultad.PUBLICAS
    ) {
      return this.seleccionarPreguntasConShuffle(
        preguntasPorDificultad[dificultadSolicitada],
        numPreguntas,
      );
    }

    let seleccionadas: Pregunta[] = [];

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

    seleccionadas = seleccionadas.filter((e) => !!e);

    while (seleccionadas.length < numPreguntas) {
      const indice = Math.floor(Math.random() * preguntas.length);
      seleccionadas.push(preguntas[indice]);
    }

    return seleccionadas.slice(0, numPreguntas);
  }

  private seleccionarPreguntasConShuffle(
    preguntas: Pregunta[],
    numPreguntas: number,
  ): Pregunta[] {
    const seleccionadas: Pregunta[] = [];
    while (seleccionadas.length < numPreguntas) {
      const duplicadas = [...preguntas];
      this.shuffleArray(duplicadas);
      seleccionadas.push(...duplicadas);
    }
    return seleccionadas.slice(0, numPreguntas);
  }

  private shuffleArray(array: Pregunta[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
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
