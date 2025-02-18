import { BadRequestException, Injectable } from '@nestjs/common';
import { Comunidad, Dificultad, Pregunta } from '@prisma/client';
import { Response } from 'express'; // Esto es válido incluso si estás usando Fastify
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
      { tema: true },
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
      { tema: true },
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

      let temaExistente = await this.prisma.tema.findFirst({
        where: {
          numero: entry['Tema'] + '',
          categoria: entry['Categoría'],
        },
      });

      if (!temaExistente) {
        temaExistente = await this.prisma.tema.create({
          data: {
            numero: entry['Tema'] + '',
            descripcion: entry['Descripción Tema'],
            categoria: entry['Categoría'],
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
