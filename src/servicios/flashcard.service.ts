import { BadRequestException, Injectable } from '@nestjs/common';
import { Response } from 'express'; // Esto es válido incluso si estás usando Fastify

import {
  Comunidad,
  Dificultad,
  EstadoFlashcard,
  FactorName,
  FlashcardData,
  FlashcardTest,
  FlashcardTestItem,
  Modulo,
  Tema,
  TestStatus,
} from '@prisma/client';
import { firstValueFrom, from, map, mergeMap, of } from 'rxjs';
import { NewFlashcardTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { DateRangeDto } from 'src/dtos/range.dto';
import { RegistrarRespuestaFlashcardDto } from 'src/dtos/registrar-respuesta.flashcard.dto';
import {
  CreateFlashcardDataDto,
  UpdateFlashcardDataDto,
} from 'src/dtos/update-flashcard.dto';
import { generarIdentificador } from 'src/utils/utils';
import * as XLSX from 'xlsx';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class FlashcardService extends PaginatedService<FlashcardData> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'flashcardData';
  }

  public async getFinishedTestsByUserId(userId: number) {
    const tests = await this.prisma.flashcardTest.findMany({
      where: {
        realizadorId: userId,
        status: 'FINALIZADO',
      },
      include: {
        flashcards: {
          include: {
            flashcard: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return tests;
  }

  public async obtainFlashcardTestStats(
    userId: number,
    testId: number,
    isAdmin = false,
  ) {
    const where = {
      id: testId,
    };
    if (!isAdmin) where['realizadorId'] = userId;
    // Encontrar el test de flashcards para el usuario
    const foundTest = await this.prisma.flashcardTest.findFirst({
      where,
      include: {
        flashcards: {
          include: {
            flashcard: true,
          },
        },
      },
    });

    if (!foundTest) {
      throw new BadRequestException('El test no existe!');
    }

    if (foundTest.status != TestStatus.FINALIZADO) {
      throw new BadRequestException('El test no está terminado todavía!');
    }

    // Obtener las respuestas del test agrupadas por estado (BIEN, MAL, REVISAR)
    const stats = await this.prisma.flashcardRespuesta.groupBy({
      by: ['estado'],
      where: {
        testItem: {
          testId: testId,
        },
      },
      _count: {
        estado: true,
      },
    });

    // Crear un mapa para las respuestas con los estados (BIEN, MAL, REVISAR)
    const estadoMap = {
      BIEN: { count: 0 },
      MAL: { count: 0 },
      REVISAR: { count: 0 },
    };

    // Procesar las estadísticas de las respuestas según el estado
    stats.forEach((stat) => {
      const key = stat.estado as keyof typeof estadoMap;
      estadoMap[key].count = stat._count.estado;
    });

    // Obtener los IDs de las flashcards que tienen respuesta
    const flashcardsConRespuestaIds = await this.prisma.flashcardRespuesta
      .findMany({
        where: {
          testItem: {
            testId: testId,
          },
        },
        select: {
          flashcardId: true,
        },
      })
      .then((respuestas) =>
        respuestas.map((respuesta) => respuesta.flashcardId),
      );

    // Contar las flashcards no respondidas
    foundTest.flashcards.forEach((fi) => {
      if (!flashcardsConRespuestaIds.includes(fi.flashcard.id)) {
        estadoMap['REVISAR'].count++; // Las flashcards no respondidas se marcan como REVISAR
      }
    });

    return {
      estado: estadoMap,
    };
  }

  public async registrarRespuestaFlashcard(
    dto: RegistrarRespuestaFlashcardDto, // DTO adaptado para flashcards,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      // Obtener el test de flashcards
      const flashcardTest = await prisma.flashcardTest.findUnique({
        where: { id: dto.testId },
      });

      // Cambiar el estado del test a 'EMPEZADO' si estaba en 'CREADO'
      if (flashcardTest.status === 'CREADO') {
        await prisma.flashcardTest.update({
          where: {
            id: dto.testId,
          },
          data: {
            status: 'EMPEZADO',
          },
        });
      }

      // Crear la respuesta para la flashcard con el estado seleccionado (BIEN, MAL, REVISAR)
      const respuestaFlashcard = await prisma.flashcardRespuesta.create({
        data: {
          testItemId: dto.testItemId, // ID de la relación FlashcardTestItem
          flashcardId: dto.flashcardId,
          estado: dto.estado, // El estado será BIEN, MAL o REVISAR
        },
      });

      // Obtener factores (mal pivot y repasar pivot)
      const factorMalPivot = await prisma.factor.findUnique({
        where: { id: FactorName.FLASHCARDS_MAL_PRIVOT },
      });

      const factorRepasarPivot = await prisma.factor.findUnique({
        where: { id: FactorName.FLASHCARDS_REPASAR_PIVOT },
      });

      // Obtener las últimas respuestas correctas del alumno
      const ultimasRespuestasCorrectas =
        await prisma.flashcardRespuesta.findMany({
          where: {
            testItem: {
              test: { realizadorId: usuarioId, status: TestStatus.FINALIZADO },
            },
            flashcardId: dto.flashcardId,
            estado: EstadoFlashcard.BIEN,
          },
          orderBy: { createdAt: 'desc' },
          take: Math.max(factorMalPivot.value, factorRepasarPivot.value), // Tomar el mayor valor de los dos factores
        });

      const ultimasRespuestasCorrectasRepasar = ultimasRespuestasCorrectas.slice(
        0,
        factorRepasarPivot.value,
      );
      const todasCorrectasRepasar = ultimasRespuestasCorrectasRepasar.every(
        (respuesta) => respuesta.estado === EstadoFlashcard.BIEN,
      );

      if (
        todasCorrectasRepasar &&
        ultimasRespuestasCorrectasRepasar.length === factorRepasarPivot.value
      ) {
        await prisma.flashcardRespuesta.deleteMany({
          where: {
            testItem: { test: { realizadorId: usuarioId, status: 'FINALIZADO' } },
            flashcardId: dto.flashcardId,
            estado: 'REVISAR',
          },
        });
      }

      const ultimasRespuestasCorrectasMal = ultimasRespuestasCorrectas.slice(
        0,
        factorMalPivot.value,
      );
      const todasCorrectasMal = ultimasRespuestasCorrectasMal.every(
        (respuesta) => respuesta.estado === 'BIEN',
      );

      if (
        todasCorrectasMal &&
        ultimasRespuestasCorrectasMal.length === factorMalPivot.value
      ) {
        await prisma.flashcardRespuesta.deleteMany({
          where: {
            testItem: { test: { realizadorId: usuarioId, status: 'FINALIZADO' } },
            flashcardId: dto.flashcardId,
            estado: 'MAL',
          },
        });
      }

      // Verificar si el test de flashcards está completo (dentro de la transacción)
      const totalFlashcards = await prisma.flashcardTestItem.count({
        where: {
          testId: dto.testId,
        },
      });

      // Contar el total de respuestas dadas en el test
      const totalRespuestas = await prisma.flashcardRespuesta.count({
        where: {
          testItem: {
            testId: dto.testId,
          },
        },
      });

      // Verificar si el test de flashcards está completo
      const testCompletado = totalRespuestas === totalFlashcards;
      console.log(`FlashcardTest ${dto.testId}: ${totalRespuestas}/${totalFlashcards} respuestas. Completado: ${testCompletado}`);
      
      if (testCompletado) {
        console.log(`Finalizando flashcard test ${dto.testId} automáticamente`);
        await prisma.flashcardTest.update({
          where: {
            id: dto.testId,
          },
          data: {
            status: 'FINALIZADO',
          },
        });
      }

      return respuestaFlashcard;
    });
  }

  public async getTestById(testId: number) {
    const test = await this.prisma.flashcardTest.findFirst({
      where: { id: testId },
      include: {
        flashcards: {
          include: {
            respuesta: true,
            flashcard: {
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

    return test;
  }

  public obtenerFallosCount(userId: number) {
    return this.prisma.flashcardRespuesta.count({
      where: {
        AND: [
          {
            testItem: {
              test: {
                realizadorId: userId,
              },
            },
          },
          {
            OR: [
              {
                estado: EstadoFlashcard.REVISAR,
              },
              {
                estado: EstadoFlashcard.MAL,
              },
            ],
          },
        ],
      },
    });
  }

  public async startTest(
    userId: number,
    dto: NewFlashcardTestDto,
    userComunidad: Comunidad,
  ) {
    const numPreguntas = dto.numPreguntas;

    // Verificar si el usuario tiene tests en progreso o creados
    const testEnProgreso = await this.prisma.flashcardTest.findFirst({
      where: {
        realizadorId: userId,
        status: { in: [TestStatus.CREADO, TestStatus.EMPEZADO] },
      },
    });

    if (testEnProgreso) {
      throw new BadRequestException('Tienes algún test ya empezado o creado!');
    }

    let flashcardsDisponibles: FlashcardData[] = [];

    // Caso cuando se trata de un test de repaso
    if (dto.generarTestDeRepaso) {
      const flashcardsMalYRevisar = await this.prisma.flashcardData.findMany({
        where: {
          temaId: { in: dto.temas },
          dificultad: { in: dto.dificultades },
          relevancia: {
            has: userComunidad,
          },
          FlashcardRespuesta: {
            some: {
              testItem: {
                test: {
                  realizadorId: userId,
                  status: TestStatus.FINALIZADO,
                },
              },
              OR: [
                { estado: EstadoFlashcard.MAL },
                { estado: EstadoFlashcard.REVISAR },
              ],
            },
          },
        },
        include: {
          FlashcardRespuesta: true,
        },
      });

      if (flashcardsMalYRevisar.length === 0) {
        throw new BadRequestException(
          'No tienes flashcards falladas o marcadas como revisar para generar un test de repaso.',
        );
      }

      // Eliminar duplicados usando un Map para mantener la última instancia de cada flashcard
      const uniqueFlashcards = new Map<number, FlashcardData>();
      flashcardsMalYRevisar.forEach(fc => {
        uniqueFlashcards.set(fc.id, fc);
      });
      const flashcardsUnicas = Array.from(uniqueFlashcards.values());

      // Barajar el array usando Fisher-Yates
      for (let i = flashcardsUnicas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flashcardsUnicas[i], flashcardsUnicas[j]] = [flashcardsUnicas[j], flashcardsUnicas[i]];
      }

      // Tomar solo el número de flashcards solicitado
      flashcardsDisponibles = flashcardsUnicas.slice(0, numPreguntas);
    } else {
      // Para un test normal (no de repaso), selecciona las flashcards basadas en temas y dificultades
      const dificultades = dto.dificultades;
      const incluyePrivada = dificultades.includes(Dificultad.PRIVADAS);
      const incluyePublica = dificultades.includes(Dificultad.PUBLICAS);
      if (!!incluyePrivada && !incluyePublica) {
        dificultades.push(Dificultad.PUBLICAS);
      }
      const todasLasFlashcards = await this.prisma.flashcardData.findMany({
        where: {
          temaId: { in: dto.temas },
          dificultad: { in: dificultades },
          relevancia: {
            has: userComunidad,
          },
          createdById: incluyePrivada ? userId : undefined,
        },
        include: {
          FlashcardRespuesta: {
            where: {
              testItem: {
                test: {
                  realizadorId: userId,
                  status: TestStatus.FINALIZADO,
                },
              },
            },
          },
        },
      });

      if (todasLasFlashcards.length === 0) {
        throw new BadRequestException(
          'No hay flashcards disponibles para los temas y dificultades seleccionados.',
        );
      }

      const noRespondidas = todasLasFlashcards.filter(
        (fc) => fc.FlashcardRespuesta.length === 0,
      );
      const malRespondidas = todasLasFlashcards.filter((fc) =>
        fc.FlashcardRespuesta.some((r) => r.estado === EstadoFlashcard.MAL),
      );
      const revisarRespondidas = todasLasFlashcards.filter((fc) =>
        fc.FlashcardRespuesta.some((r) => r.estado === EstadoFlashcard.REVISAR),
      );
      const bienRespondidas = todasLasFlashcards.filter((fc) =>
        fc.FlashcardRespuesta.every((r) => r.estado === EstadoFlashcard.BIEN),
      );

      // Definir las cantidades para cada categoría
      const factorNoRespondidas = await this.prisma.factor.findUnique({
        where: { id: FactorName.FLASHCARDS_BALANCE_NO_RESPONDIDAS },
      });

      const factorMalRespondidas = await this.prisma.factor.findUnique({
        where: { id: FactorName.FLASHCARDS_BALANCE_MAL },
      });

      const factorRevisarRespondidas = await this.prisma.factor.findUnique({
        where: { id: FactorName.FLASHCARDS_BALANCE_REVISAR },
      });

      const factorBienRespondidas = await this.prisma.factor.findUnique({
        where: { id: FactorName.FLASHCARDS_BALANCE_BIEN },
      });

      const numNoRespondidas = Math.floor(
        numPreguntas * (factorNoRespondidas.value / 100),
      );
      const numMalRespondidas = Math.floor(
        numPreguntas * (factorMalRespondidas.value / 100),
      );
      const numRevisarRespondidas = Math.floor(
        numPreguntas * (factorRevisarRespondidas.value / 100),
      );
      const numBienRespondidas = Math.floor(
        numPreguntas * (factorBienRespondidas.value / 100),
      );

      // Seleccionar flashcards para cada categoría
      let seleccionadas: FlashcardData[] = [];
      seleccionadas = seleccionadas.concat(
        this.seleccionarFlashcardsAleatorias(noRespondidas, numNoRespondidas),
        this.seleccionarFlashcardsAleatorias(malRespondidas, numMalRespondidas),
        this.seleccionarFlashcardsAleatorias(
          revisarRespondidas,
          numRevisarRespondidas,
        ),
        this.seleccionarFlashcardsAleatorias(
          bienRespondidas,
          numBienRespondidas,
        ),
      );

      // Si no se llega al número de preguntas solicitado, rellenar con flashcards aleatorias o bien respondidas
      if (seleccionadas.length < numPreguntas) {
        const faltantes = numPreguntas - seleccionadas.length;
        const rellenar =
          bienRespondidas.length > 0 ? bienRespondidas : todasLasFlashcards; // Rellenar con flashcards bien respondidas o aleatorias

        seleccionadas = seleccionadas.concat(
          this.seleccionarFlashcardsAleatorias(rellenar, faltantes),
        );
      }

      // 4) [**Nuevo**] Eliminar duplicados (por id) en 'seleccionadas'
      const uniqueMap = new Map<number, FlashcardData>();
      for (const fc of seleccionadas) {
        uniqueMap.set(fc.id, fc);
      }
      let finalSeleccionadas = Array.from(uniqueMap.values());

      // 5) Barajar (shuffle) el array finalSeleccionadas (Fisher-Yates)
      for (let i = finalSeleccionadas.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [finalSeleccionadas[i], finalSeleccionadas[randomIndex]] = [
          finalSeleccionadas[randomIndex],
          finalSeleccionadas[i],
        ];
      }

      // 6) Recortar si aún es mayor que numPreguntas
      if (finalSeleccionadas.length > numPreguntas) {
        finalSeleccionadas = finalSeleccionadas.slice(0, numPreguntas);
      }

      flashcardsDisponibles = finalSeleccionadas;
    }

    // Crear el test con las flashcards seleccionadas
    const test = await this.prisma.flashcardTest.create({
      data: {
        realizadorId: userId,
        status: TestStatus.CREADO,
        esDeRepaso: dto.generarTestDeRepaso,
      },
    });

    const testPreguntasData = flashcardsDisponibles.map((flashcard) => ({
      testId: test.id,
      flashcardId: flashcard.id,
    }));

    await this.prisma.flashcardTestItem.createMany({
      data: testPreguntasData,
    });

    const testConPreguntas = await this.getFlashcard(test.id + '');

    return testConPreguntas;
  }

  private seleccionarFlashcardsAleatorias(
    flashcards: FlashcardData[],
    numFlashcards: number,
  ): FlashcardData[] {
    // Si hay menos flashcards disponibles que el número solicitado, devolver todas las disponibles.
    if (flashcards.length <= numFlashcards) {
      return flashcards;
    }

    // Algoritmo Fisher-Yates Shuffle para mezclar el array
    for (let i = flashcards.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [flashcards[i], flashcards[randomIndex]] = [
        flashcards[randomIndex],
        flashcards[i],
      ];
    }

    // Devolver las primeras 'numFlashcards' flashcards
    return flashcards.slice(0, numFlashcards);
  }

  public async deleteTest(userId: number, testId: number) {
    const foundTest = await this.prisma.flashcardTest.findFirst({
      where: {
        id: testId,
        realizadorId: userId,
      },
    });
    if (!foundTest) throw new BadRequestException('Test no encontrado!');
    return this.prisma.flashcardTest.delete({
      where: {
        id: testId,
      },
    });
  }

  public async getPendingTestsByUserId(userId: number) {
    const flashcardTests = await this.prisma.flashcardTest.findMany({
      where: {
        realizadorId: userId,
        OR: [{ status: TestStatus.CREADO }, { status: TestStatus.EMPEZADO }],
      },
      include: {
        flashcards: {
          include: {
            respuesta: true,
          },
        },
      },
    });

    return flashcardTests
      .filter((test) => test.status !== 'FINALIZADO')
      .map((test) => ({
        ...test,
        respuestasCount: test.flashcards.flatMap((f) => f.respuesta).length,
        flashcardsCount: test.flashcards.length,
        flashcardsPendientes: test.flashcards.filter((f) => !!f.respuesta)
          .length,
      }));
  }

  public getAllFlashcards(dto: PaginationDto) {
    return this.getPaginatedData(
      dto,
      {
        identificador: {
          contains: dto.searchTerm ?? '',
          mode: 'insensitive',
        },
      },
      {
        tema: {
          include: {
            modulo: true,
          },
        }
      },
    );
  }

  public getAllFlashcardsAlumno(dto: PaginationDto, userId: number) {
    return this.getPaginatedData(
      dto,
      {
        identificador: {
          contains: dto.searchTerm ?? '',
          mode: 'insensitive',
        },
        createdById: userId,
      },
      {
        tema: {
          include: {
            modulo: true,
          },
        }
      },
    );
  }

  async getAllFlashcardsCreadasPorAlumnos(res: Response) {
    const flashcards = await this.prisma.flashcardData.findMany({
      where: {
        createdBy: {
          rol: 'ALUMNO',
        },
      },
    });

    // Genera la hoja de cálculo Excel
    const worksheet = XLSX.utils.json_to_sheet(flashcards);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Flashcards');

    // Escribe el archivo Excel en un buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Configura los headers para la descarga del archivo
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="flashcards.xlsx"',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Envía el archivo al cliente como binario
    res.send(buffer);
  }

  async getFlashcardTestsWithCategories(
    dto: DateRangeDto,
    realizadorId?: number,
  ) {
    const where = {
      createdAt: {
        gte: dto.from,
        lte: dto.to,
      },
      status: 'FINALIZADO',
    } as any;
    if (realizadorId) where['realizadorId'] = realizadorId;
    if (dto.temas && dto.temas.length > 0) where['flashcards'] = {
      some: {
        flashcard: {
          temaId: { in: dto.temas.map(Number) }
        }
      }
    }
    const flashcardTests = await this.prisma.flashcardTest.findMany({
      where,
      include: {
        flashcards: {
          include: {
            flashcard: {
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

    const testWithStats = await this.addStatsToTest(flashcardTests);
    return this.groupFlashcardsByCategory(testWithStats as any);
  }
  async addStatsToTest(tests: Array<FlashcardTest>) {
    const res = [];
    for (let test of tests) {
      test = await firstValueFrom(
        from(this.obtainFlashcardTestStats(test.realizadorId, test.id)).pipe(
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

  groupFlashcardsByCategory(
    flashcardTests: (FlashcardTest & {
      flashcards: (FlashcardTestItem & {
        flashcard: FlashcardData & { tema: Tema & { modulo: Modulo } };
      })[];
    })[],
  ) {
    const groupedFlashcards = {
      mixto: [] as FlashcardTest[], // Inicializamos la categoría 'mixto' como un array vacío
    };

    for (const flashcardTest of flashcardTests) {
      // Creamos un Set para almacenar todas las categorías de un flashcardTest
      const categorias = new Set<string>();

      for (const flashcardTestItem of flashcardTest.flashcards) {
        const categoria = flashcardTestItem.flashcard.tema.modulo.nombre;
        categorias.add(categoria); // Añadimos la categoría al Set
      }

      // Verificamos si el flashcardTest tiene más de una categoría
      if (categorias.size > 1) {
        groupedFlashcards.mixto.push(flashcardTest); // Si tiene varias categorías, lo asignamos a 'mixto'
      } else {
        // Si solo tiene una categoría, lo agrupamos bajo esa categoría
        const categoria = Array.from(categorias)[0]; // Obtenemos la única categoría

        if (!groupedFlashcards[categoria]) {
          groupedFlashcards[categoria] = [];
        }

        groupedFlashcards[categoria].push(flashcardTest); // Agrupamos el flashcardTest en su categoría
      }
    }

    return groupedFlashcards;
  }

  public async finalizarTest(testId: number, usuarioId: number) {
    const test = await this.getTestById(testId);
    if (test.realizadorId != usuarioId)
      throw new BadRequestException('Este test no te pertenece!');
    return this.prisma.$transaction(async (prisma) => {
      const notAnswered = test.flashcards.filter(
        (flashcard) => !flashcard.respuesta,
      );
      await prisma.flashcardTestItem.deleteMany({
        where: {
          id: {
            in: notAnswered.map((e) => e.id),
          },
        },
      });
      await prisma.flashcardTest.update({
        where: {
          id: testId,
        },
        data: {
          status: 'FINALIZADO',
        },
      });
      return test;
    });

    // return this.prisma.$transaction(async (prisma) => {
    //   test.preguntas.forEach((pregunta, index) => {
    //     if (!respuestasIndex.includes(index))
    //       preguntasSinResponder.push(pregunta);
    //   });
    //   await firstValueFrom(
    //     forkJoin(
    //       preguntasSinResponder.map((pregunta) => {
    //         return prisma.respuesta.create({
    //           data: {
    //             testId,
    //             preguntaId: pregunta.id,
    //             respuestaDada: null,
    //             esCorrecta: false,
    //             estado: 'OMITIDA',
    //             seguridad: SeguridadAlResponder.CIEN_POR_CIENTO,
    //           },
    //         });
    //       }),
    //     ),
    //   );
    //   const testRes = await prisma.test.update({
    //     where: {
    //       id: testId,
    //     },
    //     data: {
    //       status: 'FINALIZADO',
    //     },
    //   });
    //   return testRes;
    // });
  }

  public getFlashcard(flashcardDataId: string) {
    return this.prisma.flashcardData.findFirst({
      where: {
        id: Number(flashcardDataId),
      },
    });
  }

  public deleteFlashcard(flashcardId: string) {
    return this.prisma.flashcardData.delete({
      where: {
        id: Number(flashcardId),
      },
    });
  }

  public async updateFlashcard(
    dto: UpdateFlashcardDataDto | CreateFlashcardDataDto,
    userId: number,
  ) {
    const user = await this.prisma.usuario.findFirst({
      where: {
        id: userId,
      },
    });

    if (!user) throw new BadRequestException('Usuario no existe!');
    if (!dto.relevancia || dto.relevancia.length == 0)
      throw new BadRequestException('Debes seleccionar una relevancia!');
    if (!dto.temaId)
      throw new BadRequestException('El tema no puede ser nulo!');
    if (!dto.descripcion)
      throw new BadRequestException('El enunciado no puede estar vacio!');
    if (!dto.solucion)
      throw new BadRequestException('La solución no puede estar vacia!');
    //Auto generar identificador
    if (!dto.identificador)
      dto.identificador = await generarIdentificador(
        user.rol,
        'FLASHCARD',
        dto.temaId,
        this.prisma,
        dto.dificultad == Dificultad.EXAMEN
      );
    if ('id' in dto) {
      const fallos = await this.prisma.reporteFallo.findMany({
        where: {
          flashcardDataId: dto.id,
        },
      });
      if (fallos.length > 0) {
        await this.prisma.reporteFallo.deleteMany({
          where: {
            flashcardDataId: dto.id,
          },
        });
      }
      return this.prisma.flashcardData.update({
        where: {
          id: dto.id,
        },
        data: {
          identificador: dto.identificador,
          relevancia: dto.relevancia,
          dificultad: dto.dificultad ?? Dificultad.INTERMEDIO,
          tema: {
            connect: {
              id: dto.temaId,
            },
          },
          updatedBy: {
            connect: {
              id: userId,
            },
          },
          descripcion: dto.descripcion,
          solucion: dto.solucion,
        },
      });
    } else {
      const identificadorExistente = await this.prisma.flashcardData.count({
        where: {
          identificador: dto.identificador,
        },
      });
      if (identificadorExistente > 0)
        throw new BadRequestException(
          `El identificador ${dto.identificador} ya existe!`,
        );
      return this.prisma.flashcardData.create({
        data: {
          identificador: dto.identificador,
          relevancia: dto.relevancia,
          dificultad: dto.dificultad ?? Dificultad.INTERMEDIO,
          tema: {
            connect: {
              id: dto.temaId,
            },
          },
          createdBy: {
            connect: {
              id: userId,
            },
          },
          updatedBy: {
            connect: {
              id: userId,
            },
          },
          descripcion: dto.descripcion,
          solucion: dto.solucion,
        },
      });
    }
  }

  public async importarExcel(file: Express.Multer.File, userId: number) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Asume que los datos están en la primera hoja
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(sheet);
    let insertados = 0;
    for (const entry of jsonData) {
      const identificador = entry['identificador'] || entry['Identificador'];
      const relevancia = entry['relevancia'] || entry['Relevancia'];
      if (!identificador) {
        console.log('No hay identificador, ignorando');
        continue;
      }
      const existingPregunta = await this.prisma.flashcardData.findUnique({
        where: { identificador: identificador.toString() },
      });
      if (!!existingPregunta) {
        console.log(
          `Pregunta con identificador ${identificador} ya existe. Ignorando...`,
        );
        continue; // Si ya existe, ignorar esta entrada y continuar con la siguiente
      }

      let modulo = await this.prisma.modulo.findFirst({
        where: {
          nombre: entry['Categoría'],
        },
      });

      if (!modulo) {
        console.log(`Módulo con nombre ${entry['Categoría']} no encontrado. Creando nuevo módulo...`);
        modulo = await this.prisma.modulo.create({
          data: {
            nombre: entry['Categoría'],
            esPublico: true,
            descripcion: 'Modulo de ' + entry['Categoría'],
          },
        });
      }

      let temaExistente = await this.prisma.tema.findFirst({
        where: {
          numero: entry['Tema'] + '',
          moduloId: modulo.id,
        },
      });

      if (!temaExistente) {
        temaExistente = await this.prisma.tema.create({
          data: {
            numero: entry['Tema'] + '',
            descripcion: entry['Descripción Tema'],
            moduloId: modulo.id,
          },
        });
      }

      let dificultadEnum: Dificultad = Dificultad.BASICO;
      if (entry['Dificultad']) {
        switch (entry['Dificultad'].toLowerCase()) {
          case 'datos basicos':
            dificultadEnum = Dificultad.BASICO;
            break;
          case 'datos':
            dificultadEnum = Dificultad.INTERMEDIO;
            break;
          case 'tarjetas':
            dificultadEnum = Dificultad.DIFICIL;
            break;
          case 'privadas':
            dificultadEnum = Dificultad.PRIVADAS;
            break;
          case 'publicas':
            dificultadEnum = Dificultad.PUBLICAS;
            break;
          default:
            throw new BadRequestException(
              `Dificultad desconocida: ${entry['Dificultad']}`,
            );
        }
      }

      const relevanciaArray: Comunidad[] = [
        relevancia.trim().toUpperCase() as Comunidad,
      ];

      await this.prisma.flashcardData.create({
        data: {
          identificador: identificador.toString(),
          descripcion: entry['Descripción'] + '',
          solucion: (entry['Solución'] ?? '') + '',
          temaId: temaExistente.id,
          dificultad: dificultadEnum,
          relevancia: relevanciaArray,
          createdById: userId,
          updatedById: userId,
        },
      });
      insertados++;
    }

    return {
      message: 'Archivo procesado exitosamente',
      count: insertados,
      ignoradas: jsonData.length - insertados,
    };
  }
}

@Injectable()
export class FlashcardTestService extends PaginatedService<FlashcardTest> {
  private includeConfig = {
    realizador: true,
    flashcards: {
      include: {
        flashcard: {
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
    private flashcardService: FlashcardService,
  ) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'flashcardTest';
  }

  public getAllFlashcardsTestsAdmin(dto: PaginationDto) {
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
        this.includeConfig,
      ),
    ).pipe(
      mergeMap((res) => {
        if (res.data.length == 0) return of(res);
        // Usar Promise.all para mantener el orden
        return from(Promise.all(
          res.data.map(entry =>
            this.flashcardService.obtainFlashcardTestStats(entry.realizadorId, entry.id)
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

  public getAllFlashcardsTestsAlumno(dto: PaginationDto, realizadorId: number) {
    return from(
      this.getPaginatedData(
        dto,
        {
          ...dto.where,
          realizadorId,
          status: TestStatus.FINALIZADO,
          realizador: {
            email: {
              contains: dto.searchTerm ?? '',
              mode: 'insensitive',
            },
          },
        },
        this.includeConfig,
      ),
    ).pipe(
      mergeMap((res) => {
        if (res.data.length == 0) return of(res);
        // Usar Promise.all para mantener el orden
        return from(Promise.all(
          res.data.map(entry =>
            this.flashcardService.obtainFlashcardTestStats(entry.realizadorId, entry.id)
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
}
