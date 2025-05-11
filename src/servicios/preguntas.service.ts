import { BadRequestException, Injectable } from '@nestjs/common';
import { Comunidad, Dificultad, Pregunta, PrismaClient } from '@prisma/client';
import { Response } from 'express'; // Esto es válido incluso si estás usando Fastify
import { NewTestDto } from 'src/dtos/new-test.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  CreatePreguntaDto,
  UpdatePreguntaDto,
} from 'src/dtos/update-pregunta.dto';
import { generarIdentificador } from 'src/utils/utils';
import * as XLSX from 'xlsx';
import { PaginatedService } from './paginated.service';
import { PrismaService } from './prisma.service';
@Injectable()
export class PreguntasService extends PaginatedService<Pregunta> {
  constructor(protected prisma: PrismaService) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'pregunta';
  }

  public async generarPreguntasTest(dto: NewTestDto, userId: number, userComunidad: Comunidad, prismaArg?: PrismaClient) {
    // dto.dificultad ahora es un array con dificultades seleccionadas por el alumno
    const prisma = prismaArg ?? this.prisma;
    let preguntasDisponibles: Pregunta[] = [];
    if (!dto.dificultades || dto.dificultades.length === 0) {
      throw new BadRequestException(
        'Debes seleccionar al menos una dificultad!',
      );
    }

    // Separamos las dificultades “especiales” (PRIVADAS, PUBLICAS) de las “normales”
    const includesPrivadas = dto.dificultades.includes(Dificultad.PRIVADAS);
    const includesPublicas = dto.dificultades.includes(Dificultad.PUBLICAS);

    // Filtramos el resto (BASICO, INTERMEDIO, DIFICIL, etc.)
    const normalDiffs = dto.dificultades.filter(
      (d) => d !== Dificultad.PRIVADAS && d !== Dificultad.PUBLICAS,
    );

    // 1) Si incluyeron PRIVADAS -> preguntas creadas por el usuario
    if (includesPrivadas) {
      const privateQuestions = await prisma.pregunta.findMany({
        where: {
          temaId: { in: dto.temas },
          createdById: userId,
          relevancia: {
            has: userComunidad,
          },
          // En tu lógica original, cuando era Dificultad.PRIVADAS,
          // incluías [PRIVADAS, PUBLICAS], así que lo respetamos:
          dificultad: { in: [Dificultad.PRIVADAS, Dificultad.PUBLICAS] },
        },
      });
      preguntasDisponibles.push(...privateQuestions);
    }

    // 2) Si incluyeron PUBLICAS -> preguntas públicas (de cualquier creador)
    if (includesPublicas) {
      const publicQuestions = await prisma.pregunta.findMany({
        where: {
          temaId: { in: dto.temas },
          relevancia: {
            has: userComunidad,
          },
          dificultad: { in: [Dificultad.PUBLICAS] },
        },
      });
      preguntasDisponibles.push(...publicQuestions);
    }

    // 3) Preguntas de las “dificultades normales” (BASICO, INTERMEDIO, DIFICIL, etc.)
    if (normalDiffs.length > 0) {
      const normalQuestions = await prisma.pregunta.findMany({
        where: {
          temaId: { in: dto.temas },
          relevancia: {
            has: userComunidad,
          },
          dificultad: {
            in: normalDiffs,
          },
        },
      });
      preguntasDisponibles.push(...normalQuestions);
    }

    // Si nada ha devuelto resultados
    if (preguntasDisponibles.length === 0) {
      throw new BadRequestException(
        'No hay preguntas disponibles para los temas y dificultades seleccionados.',
      );
    }

    // (Opcional) Elimina duplicados si existiera la posibilidad de colisión
    const uniqueMap = new Map<number, Pregunta>();
    for (const p of preguntasDisponibles) {
      uniqueMap.set(p.id, p);
    }
    preguntasDisponibles = Array.from(uniqueMap.values());

    // Finalmente barajamos y cortamos a 'numPreguntas'
    preguntasDisponibles = this.seleccionarPreguntasConShuffle(
      preguntasDisponibles,
      dto.numPreguntas,
    );
    return preguntasDisponibles;
  }

  private seleccionarPreguntasConShuffle(
    preguntas: Pregunta[],
    numPreguntas: number,
  ): Pregunta[] {
    // 1) Eliminar duplicados por ID.
    const uniqueMap = new Map<number, Pregunta>();
    for (const p of preguntas) {
      uniqueMap.set(p.id, p);
    }
    let finalPreguntas = Array.from(uniqueMap.values());

    // 2) Barajar con Fisher-Yates (o tu método preferido).
    for (let i = finalPreguntas.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [finalPreguntas[i], finalPreguntas[randomIndex]] = [
        finalPreguntas[randomIndex],
        finalPreguntas[i],
      ];
    }

    // 3) Recortar si hay más preguntas de las necesarias.
    if (finalPreguntas.length > numPreguntas) {
      finalPreguntas = finalPreguntas.slice(0, numPreguntas);
    }

    return finalPreguntas;
  }

  public deletePregunta(preguntaId: string) {
    return this.prisma.pregunta.delete({
      where: {
        id: Number(preguntaId),
      },
    });
  }

  public getPregunta(preguntaId: string) {
    return this.prisma.pregunta.findFirst({
      where: {
        id: Number(preguntaId),
      },
      include: {
        testPreguntas: true
      }
    });
  }

  public getPreguntaByIdentificador(identificador: string) {
    return this.prisma.pregunta.findFirst({
      where: {
        identificador: identificador,
      },
    });
  }

  public async getAllPreguntasCreadasPorAlumnos(res: Response) {
    const preguntas = await this.prisma.pregunta.findMany({
      where: {
        createdBy: {
          rol: 'ALUMNO',
        },
      },
    });
    // Genera la hoja de cálculo Excel
    const worksheet = XLSX.utils.json_to_sheet(preguntas);
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

  public getAllPreguntas(dto: PaginationDto) {
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

  public getAllPreguntasAlumno(dto: PaginationDto, userId: number) {
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

  public async updatePregunta(
    dto: UpdatePreguntaDto | CreatePreguntaDto,
    userId: number,
  ) {
    if (!dto.relevancia || dto.relevancia.length == 0)
      throw new BadRequestException('Debes seleccionar una relevancia!');
    if (!dto.temaId)
      throw new BadRequestException('El tema no puede ser nulo!');
    if (!dto.descripcion)
      throw new BadRequestException('La descripción es requerida!');
    const user = await this.prisma.usuario.findFirst({
      where: {
        id: userId,
      },
    });
    if (!user) throw new BadRequestException('Usuario no existe!');

    //Auto generar identificador
    if (!dto.identificador)
      dto.identificador = await generarIdentificador(
        user.rol,
        'PREGUNTA',
        dto.temaId,
        this.prisma,
        dto.dificultad == Dificultad.EXAMEN
      );
    if ('id' in dto) {
      const fallos = await this.prisma.reporteFallo.findMany({
        where: {
          preguntaId: dto.id,
        },
      });
      if (fallos.length > 0) {
        await this.prisma.reporteFallo.deleteMany({
          where: {
            preguntaId: dto.id,
          },
        });
      }
      return this.prisma.pregunta.update({
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
          respuestas: dto.respuestas,
          respuestaCorrectaIndex: dto.respuestaCorrectaIndex,
          seguridad: dto.seguridad,
        },
      });
    } else {
      const identificadorExistente = await this.prisma.pregunta.count({
        where: {
          identificador: dto.identificador,
        },
      });
      if (identificadorExistente > 0)
        throw new BadRequestException(
          `El identificador ${dto.identificador} ya existe!`,
        );
      return this.prisma.pregunta.create({
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
          solucion: dto.solucion ?? '',
          respuestas: dto.respuestas,
          respuestaCorrectaIndex: dto.respuestaCorrectaIndex ?? 0,
          seguridad: dto.seguridad,
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
      if (!entry['identificador']) {
        console.log('No hay identificador, ignorando');
        continue;
      }
      const existingPregunta = await this.prisma.pregunta.findUnique({
        where: { identificador: entry['identificador'].toString() },
      });

      if (existingPregunta) {
        console.log(
          `Pregunta con identificador ${entry['identificador']} ya existe. Ignorando...`,
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

      const respuestasArray: string[] = [
        entry['Answer 1'],
        entry['Answer 2'],
        entry['Answer 3'],
        entry['Answer 4'],
      ].filter((answer) => !!answer);

      let dificultadEnum: Dificultad;
      switch (entry['Dificultad'].toLowerCase()) {
        case 'basico':
          dificultadEnum = Dificultad.BASICO;
          break;
        case 'intermedio':
          dificultadEnum = Dificultad.INTERMEDIO;
          break;
        case 'dificil':
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

      const relevanciaArray: Comunidad[] = [
        entry['relevancia'].trim().toUpperCase() as Comunidad,
      ];

      await this.prisma.pregunta.create({
        data: {
          identificador: entry['identificador'].toString(),
          descripcion: entry['Descripción'],
          solucion: entry['Solución'] ?? '',
          respuestas: respuestasArray.map((e) => e + ''),
          respuestaCorrectaIndex: parseInt(entry['Correct answer'], 10) - 1,
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
