import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Comunidad,
  FactorName,
  Modulo,
  Pregunta,
  PrismaClient,
  Respuesta,
  SeguridadAlResponder,
  Tema,
  Test,
  TestPregunta,
  TestStatus
} from '@prisma/client';
import {
  firstValueFrom,
  forkJoin,
  from,
  map,
  mergeMap,
  of
} from 'rxjs';
import { NewTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { DateRangeDto } from 'src/dtos/range.dto';
import { RegistrarRespuestaDto } from 'src/dtos/registrar-respuesta.dto';
import { PaginatedResult, PaginatedService } from './paginated.service';
import { PreguntasService } from './preguntas.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class RespuestaPaginatedService extends PaginatedService<Respuesta> {
  constructor(protected prisma: PrismaService) {
    super(prisma);

    this.prisma.test.findFirst({
      where: {
        testPreguntas: {
          some: {
            pregunta: {
              temaId: {
                in: [1, 2, 3]
              }
            }
          }
        }
      },
      include: {

      }
    })
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
    ExamenRealizado: true,
    testPreguntas: {
      include: {
        pregunta: {
          include: {
            tema: {
              include: {
                modulo: true,
              },
            },
          },
        },
      },
    },
  };

  constructor(
    protected prisma: PrismaService,
    private paginatedService: RespuestaPaginatedService,
    private preguntasService: PreguntasService
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
        // Mantener el orden original usando Promise.all
        return from(Promise.all(
          res.data.map(entry =>
            this.obtainTestStats(userId, entry.id)
              .then(stats => ({
                ...entry,
                stats,
              }))
          )
        )).pipe(
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
        // Usar Promise.all para mantener el orden
        return from(Promise.all(
          res.data.map(test =>
            this.obtainTestStats(test.realizadorId, test.id)
              .then(stats => ({
                ...test,
                stats,
              }))
          )
        )).pipe(
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
    if (dto.temas && dto.temas.length > 0) where['testPreguntas'] = {
      some: {
        pregunta: {
          temaId: { in: dto.temas.map(Number) }
        }
      }
    }
    where['realizadorId'] = realizadorId;
    const tests = await this.prisma.test.findMany({
      where,
      include: {
        testPreguntas: {
          include: {
            pregunta: {
              include: {
                tema: {
                  include: {
                    modulo: true,
                  },
                },
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
    // Usar Promise.all para mantener el orden
    return Promise.all(
      tests.map(test =>
        this.obtainTestStats(test.realizadorId, test.id)
          .then(stats => ({
            ...test,
            stats,
          }))
      )
    );
  }

  groupTestsByCategory(
    tests: (Test & {
      testPreguntas: (TestPregunta & { pregunta: Pregunta & { tema: Tema & { modulo: Modulo } } })[];
    })[],
  ) {
    const groupedTests = {
      mixto: [] as Test[],
    };

    for (const test of tests) {
      const categorias = new Set<string>();

      for (const testPregunta of test.testPreguntas) {
        const categoria = testPregunta.pregunta.tema.modulo.nombre;
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
      [SeguridadAlResponder.CINCUENTA_POR_CIENTO]: {
        correctas: 0,
        incorrectas: 0,
        noRespondidas: 0,
      },
      [SeguridadAlResponder.SETENTA_Y_CINCO_POR_CIENTO]: {
        correctas: 0,
        incorrectas: 0,
        noRespondidas: 0,
      },
      [SeguridadAlResponder.CIEN_POR_CIENTO]: {
        correctas: 0,
        incorrectas: 0,
        noRespondidas: 0,
      },
      [SeguridadAlResponder.CERO_POR_CIENTO]: {
        correctas: 0,
        incorrectas: 0,
        noRespondidas: 0,
      },
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

  public async getTestById(testId: number, userId: number) {
    const test = await this.prisma.test.findFirst({
      where: { id: testId, realizadorId: userId },
      include: {
        respuestas: true,
        testPreguntas: {
          include: {
            pregunta: {
              include: {
                tema: {
                  include: {
                    modulo: true,
                  },
                },
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

  public async finalizarTest(testId: number, usuarioId: number) {
    const test = await this.getTestById(testId, usuarioId);
    if (test.realizadorId != usuarioId)
      throw new BadRequestException('Este test no te pertenece!');
    return this.prisma.$transaction(async (prisma) => {
      const preguntasSinResponder = [];
      const respuestasIndex = test.respuestas.map((e) => e.indicePregunta);
      test.preguntas.forEach((pregunta, index) => {
        if (!respuestasIndex.includes(index))
          preguntasSinResponder.push(pregunta);
      });
      await firstValueFrom(
        forkJoin(
          preguntasSinResponder.map((pregunta) => {
            return prisma.respuesta.create({
              data: {
                testId,
                preguntaId: pregunta.id,
                respuestaDada: null,
                esCorrecta: false,
                estado: 'OMITIDA',
                seguridad: SeguridadAlResponder.CIEN_POR_CIENTO,
              },
            });
          }),
        ),
      );
      const testRes = await prisma.test.update({
        where: {
          id: testId,
        },
        data: {
          status: 'FINALIZADO',
        },
      });
      return testRes;
    });
  }

  public async registrarRespuesta(
    dto: RegistrarRespuestaDto,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const test = await prisma.test.findUnique({
        where: { id: dto.testId },
      });

      if (this.examenTestHasExpired(test)) {
        await prisma.test.update({
          where: { id: dto.testId },
          data: {
            status: 'FINALIZADO',
          },
        });
        throw new BadRequestException('El tiempo del examen ha expirado.');
      }
      if (test.status == 'CREADO') {
        await prisma.test.update({
          where: {
            id: dto.testId,
          },
          data: {
            status: 'EMPEZADO',
          },
        });
      }

      const pregunta = await prisma.pregunta.findUnique({
        where: { id: dto.preguntaId },
      });

      const esCorrecta = pregunta.respuestaCorrectaIndex === dto.respuestaDada;

      const respuestaExistente = await prisma.respuesta.findFirst({
        where: {
          testId: dto.testId,
          preguntaId: dto.preguntaId,
          indicePregunta: dto.indicePregunta,
        },
      });
      let respuesta: Respuesta = null;
      if (!!respuestaExistente) {
        //El usuario ha deseleccionado la respuesta
        if (dto.respuestaDada == -1) {
          respuesta = await prisma.respuesta.delete({
            where: {
              id: respuestaExistente.id,
            },
          });
          respuesta.respuestaDada = -1;
        } else {
          respuesta = await prisma.respuesta.update({
            where: {
              id: respuestaExistente.id,
            },
            data: {
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
        }
      } else {
        respuesta = await prisma.respuesta.create({
          data: {
            testId: dto.testId,
            preguntaId: dto.preguntaId,
            respuestaDada: dto.respuestaDada,
            esCorrecta: esCorrecta,
            indicePregunta: dto.indicePregunta,
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
      }

      // Aplicar lógica del factor (solo si no se deseleccionó la respuesta)
      if (dto.respuestaDada !== -1) {
        const factorPivot = await prisma.factor.findUnique({
          where: { id: FactorName.PREGUNTAS_MALAS_PIVOT },
        });
        const factorPivote = factorPivot?.value ?? 5;
        const ultimasRespuestas = await prisma.respuesta.findMany({
          where: {
            test: {
              realizadorId: usuarioId,
            },
            preguntaId: dto.preguntaId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: factorPivote,
        });

        const todasCorrectas = ultimasRespuestas.every(
          (respuesta) => respuesta.esCorrecta,
        );

        if (todasCorrectas && ultimasRespuestas.length === factorPivote) {
          // Eliminar las respuestas incorrectas de esta pregunta si todas las últimas N fueron correctas
          await prisma.respuesta.deleteMany({
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
      }

      // Verificar si el test está completo (dentro de la transacción)
      const totalPreguntas = await prisma.testPregunta.count({
        where: {
          testId: dto.testId,
        },
      });

      const totalRespuestas = await prisma.respuesta.count({
        where: {
          testId: dto.testId,
        },
      });

      const testCompletado = totalRespuestas === totalPreguntas;
      
      if (testCompletado) {
        await prisma.test.update({
          where: {
            id: dto.testId,
          },
          data: {
            status: 'FINALIZADO',
          },
        });
      }

      return respuesta;
    });
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

      let preguntasDisponibles: Pregunta[] = [];

      // Si es un test de repaso, tomamos solo preguntas falladas por el usuario.
      if (dto.generarTestDeRepaso) {
        const fallos = await prisma.respuesta.findMany({
          where: {
            test: {
              realizadorId: userId,
              status: 'FINALIZADO',
            },
            esCorrecta: false,
            pregunta: {
              temaId: {
                in: dto.temas
              }
            }
          },
          include: { pregunta: true },
        });

        if (fallos.length === 0) {
          throw new BadRequestException(
            'No tienes preguntas falladas para generar un test de repaso.',
          );
        }

        // Eliminar duplicados usando un Map para mantener la última instancia de cada pregunta
        const uniquePreguntas = new Map<number, Pregunta>();
        fallos.forEach(fallo => {
          uniquePreguntas.set(fallo.pregunta.id, fallo.pregunta);
        });
        const preguntasUnicas = Array.from(uniquePreguntas.values());

        // Barajar el array usando Fisher-Yates
        for (let i = preguntasUnicas.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [preguntasUnicas[i], preguntasUnicas[j]] = [preguntasUnicas[j], preguntasUnicas[i]];
        }

        // Tomar solo el número de preguntas solicitado
        preguntasDisponibles = preguntasUnicas.slice(0, dto.numPreguntas);
      } else {
        preguntasDisponibles = await this.preguntasService.generarPreguntasTest(dto, userId, userComunidad, prisma as PrismaClient);
      }

      // Crear el test en la base de datos
      const newTest = await prisma.test.create({
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
      // Para mayor seguridad, si la lista vino más grande que numPreguntas,
      // la cortamos en 'seleccionarPreguntasConShuffle' o aquí mismo.
      const testPreguntasData = preguntasDisponibles.map((pregunta) => ({
        testId: newTest.id,
        preguntaId: pregunta.id,
      }));

      await prisma.testPregunta.createMany({
        data: testPreguntasData,
      });

      return newTest;
    });

    // Recuperar el test con las preguntas asociadas
    const testConPreguntas = await this.getTestById(test.id, userId);
    return testConPreguntas;
  }
}
