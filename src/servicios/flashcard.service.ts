import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Comunidad,
  Dificultad,
  EstadoFlashcard,
  FactorName,
  FlashcardData,
  TestStatus,
} from '@prisma/client';
import { NewTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { RegistrarRespuestaFlashcardDto } from 'src/dtos/registrar-respuesta.flashcard.dto';
import {
  CreateFlashcardDataDto,
  UpdateFlashcardDataDto,
} from 'src/dtos/update-flashcard.dto';
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

  public async obtainFlashcardTestStats(userId: number, testId: number) {
    // Encontrar el test de flashcards para el usuario
    const foundTest = await this.prisma.flashcardTest.findFirst({
      where: {
        id: testId,
        realizadorId: userId,
      },
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
    // Obtener el test de flashcards
    const flashcardTest = await this.prisma.flashcardTest.findUnique({
      where: { id: dto.testId },
    });

    // Cambiar el estado del test a 'EMPEZADO' si estaba en 'CREADO'
    if (flashcardTest.status === 'CREADO') {
      await this.prisma.flashcardTest.update({
        where: {
          id: dto.testId,
        },
        data: {
          status: 'EMPEZADO',
        },
      });
    }

    // Crear la respuesta para la flashcard con el estado seleccionado (BIEN, MAL, REVISAR)
    const respuestaFlashcard = await this.prisma.flashcardRespuesta.create({
      data: {
        testItemId: dto.testItemId, // ID de la relación FlashcardTestItem
        flashcardId: dto.flashcardId,
        estado: dto.estado, // El estado será BIEN, MAL o REVISAR
      },
    });

    // Obtener factores (mal pivot y repasar pivot)
    const factorMalPivot = await this.prisma.factor.findUnique({
      where: { id: FactorName.FLASHCARDS_MAL_PRIVOT },
    });

    const factorRepasarPivot = await this.prisma.factor.findUnique({
      where: { id: FactorName.FLASHCARDS_REPASAR_PIVOT },
    });

    // Obtener las últimas respuestas correctas del alumno
    const ultimasRespuestasCorrectas =
      await this.prisma.flashcardRespuesta.findMany({
        where: {
          testItem: {
            test: { realizadorId: usuarioId },
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
      await this.prisma.flashcardRespuesta.deleteMany({
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
      await this.prisma.flashcardRespuesta.deleteMany({
        where: {
          testItem: { test: { realizadorId: usuarioId, status: 'FINALIZADO' } },
          flashcardId: dto.flashcardId,
          estado: 'MAL',
        },
      });
    }

    const totalFlashcards = await this.prisma.flashcardTestItem.count({
      where: {
        testId: dto.testId,
      },
    });

    // Contar el total de respuestas dadas en el test
    const totalRespuestas = await this.prisma.flashcardRespuesta.count({
      where: {
        testItem: {
          testId: dto.testId,
        },
      },
    });

    // Verificar si el test de flashcards está completo
    const testCompletado = totalRespuestas === totalFlashcards;
    if (testCompletado) {
      await this.prisma.flashcardTest.update({
        where: {
          id: dto.testId,
        },
        data: {
          status: 'FINALIZADO',
        },
      });
    }

    return respuestaFlashcard;
  }

  public async getTestById(testId: number) {
    const test = await this.prisma.flashcardTest.findFirst({
      where: { id: testId },
      include: {
        flashcards: {
          include: {
            respuesta: true,
            flashcard: true,
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
    dto: NewTestDto,
    userComunidad: Comunidad,
  ) {
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
    let flashcardsDisponibles: FlashcardData[];
    if (dto.generarTestDeRepaso) {
      const fallos = await this.prisma.flashcardRespuesta.findMany({
        where: {
          testItem: {
            test: {
              realizadorId: userId,
              status: TestStatus.FINALIZADO,
            },
          },
          OR: [
            {
              estado: EstadoFlashcard.MAL,
            },
            {
              estado: EstadoFlashcard.REVISAR,
            },
          ],
        },
        include: {
          flashcard: true,
        },
      });

      if (fallos.length === 0) {
        throw new BadRequestException(
          'No tienes flashcards falladas para generar un test de repaso.',
        );
      }

      flashcardsDisponibles = fallos.map((fallo) => fallo.flashcard);

      if (flashcardsDisponibles.length < dto.numPreguntas) {
        const faltantes = dto.numPreguntas - flashcardsDisponibles.length;
        for (let i = 0; i < faltantes; i++) {
          const flashcardRepetida =
            flashcardsDisponibles[i % flashcardsDisponibles.length];
          flashcardsDisponibles.push(flashcardRepetida);
        }
      }
    } else {
      flashcardsDisponibles = await this.prisma.flashcardData.findMany({
        where: {
          temaId: { in: dto.temas },
          relevancia: {
            has: userComunidad,
          },
        },
      });

      if (flashcardsDisponibles.length === 0) {
        throw new BadRequestException(
          'No hay flashcards disponibles para los temas seleccionados.',
        );
      }

      // Seleccionar preguntas según la dificultad y cantidad solicitada
      flashcardsDisponibles = this.seleccionarFlashcardsPorDificultad(
        flashcardsDisponibles,
        dto.numPreguntas,
        dto.dificultad,
      );
    }

    // Crear el test en la base de datos
    const test = await this.prisma.flashcardTest.create({
      data: {
        realizadorId: userId,
        status: TestStatus.CREADO,
      },
    });

    const testPreguntasData = flashcardsDisponibles
      .slice(0, dto.numPreguntas)
      .map((flashcard) => ({
        testId: test.id,
        flashcardId: flashcard.id,
      }));

    await this.prisma.flashcardTestItem.createMany({
      data: testPreguntasData,
    });
    const testConPreguntas = await this.getFlashcard(test.id + '');

    return testConPreguntas;
  }

  private seleccionarFlashcardsPorDificultad(
    flashcards: FlashcardData[],
    numFlashcards: number,
    dificultadSolicitada: Dificultad,
  ): FlashcardData[] {
    const distribucion =
      this.obtenerDistribucionDificultadFlashcards(dificultadSolicitada);

    const flashcardsPorDificultad = {
      TARJETAS: flashcards.filter((f) => f.dificultad === Dificultad.DIFICIL),
      DATOS: flashcards.filter((f) => f.dificultad === Dificultad.INTERMEDIO),
      DATOS_BASICOS: flashcards.filter(
        (f) => f.dificultad === Dificultad.BASICO,
      ),
    };

    const seleccionadas: FlashcardData[] = [];

    const seleccionarConRepeticion = (
      listaFlashcards: FlashcardData[],
      cantidad: number,
    ): FlashcardData[] => {
      const resultado: FlashcardData[] = [];
      for (let i = 0; i < cantidad; i++) {
        const indice = Math.floor(Math.random() * listaFlashcards.length);
        resultado.push(listaFlashcards[indice]);
      }
      return resultado;
    };

    seleccionadas.push(
      ...seleccionarConRepeticion(
        flashcardsPorDificultad.TARJETAS,
        Math.round(distribucion.dificil * numFlashcards),
      ),
    );

    seleccionadas.push(
      ...seleccionarConRepeticion(
        flashcardsPorDificultad.DATOS,
        Math.round(distribucion.intermedio * numFlashcards),
      ),
    );

    seleccionadas.push(
      ...seleccionarConRepeticion(
        flashcardsPorDificultad.DATOS_BASICOS,
        Math.round(distribucion.facil * numFlashcards),
      ),
    );

    while (seleccionadas.length < numFlashcards) {
      const indice = Math.floor(Math.random() * flashcards.length);
      seleccionadas.push(flashcards[indice]);
    }

    return seleccionadas.slice(0, numFlashcards);
  }

  private obtenerDistribucionDificultadFlashcards(dificultad: Dificultad) {
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
      { tema: true },
    );
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

  public updateFlashcard(dto: UpdateFlashcardDataDto | CreateFlashcardDataDto) {
    if ('id' in dto) {
      return this.prisma.flashcardData.update({
        where: {
          id: dto.id,
        },
        data: {
          identificador: dto.identificador,
          relevancia: dto.relevancia,
          dificultad: dto.dificultad,
          tema: {
            connect: {
              id: dto.temaId,
            },
          },
          descripcion: dto.descripcion,
          solucion: dto.solucion,
        },
      });
    } else {
      return this.prisma.flashcardData.create({
        data: {
          identificador: dto.identificador,
          relevancia: dto.relevancia,
          dificultad: dto.dificultad,
          tema: {
            connect: {
              id: dto.temaId,
            },
          },
          descripcion: dto.descripcion,
          solucion: dto.solucion,
        },
      });
    }
  }

  public async importarExcel(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Asume que los datos están en la primera hoja
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(sheet);

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

      let temaExistente = await this.prisma.tema.findFirst({
        where: {
          numero: parseInt(entry['Tema'], 10),
        },
      });

      if (!temaExistente) {
        temaExistente = await this.prisma.tema.create({
          data: {
            numero: parseInt(entry['Tema'], 10),
            descripcion: entry['Descripción Tema'],
            categoria: entry['Categoría'],
          },
        });
      }

      let dificultadEnum: Dificultad;
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
        default:
          throw new BadRequestException(
            `Dificultad desconocida: ${entry['Dificultad']}`,
          );
      }

      const relevanciaArray: Comunidad[] = [
        relevancia.trim().toUpperCase() as Comunidad,
      ];

      await this.prisma.flashcardData.create({
        data: {
          identificador: identificador.toString(),
          descripcion: entry['Descripción'],
          solucion: entry['Solución'] ?? '',
          temaId: temaExistente.id,
          dificultad: dificultadEnum,
          relevancia: relevanciaArray,
        },
      });
    }

    return { message: 'Archivo procesado exitosamente' };
  }
}
