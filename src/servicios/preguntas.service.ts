import { BadRequestException, Injectable } from '@nestjs/common';
import { Comunidad, Dificultad, Pregunta } from '@prisma/client';
import { PaginationDto } from 'src/dtos/pagination.dto';
import {
  CreatePreguntaDto,
  UpdatePreguntaDto,
} from 'src/dtos/update-pregunta.dto';
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

  public getAllPreguntas(dto: PaginationDto) {
    return this.getPaginatedData(
      dto,
      {
        identificador: {
          contains: dto.searchTerm ?? '',
        },
      },
      { tema: true },
    );
  }

  public updatePregunta(dto: UpdatePreguntaDto | CreatePreguntaDto) {
    if ('id' in dto) {
      return this.prisma.pregunta.update({
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
          respuestas: dto.respuestas,
          respuestaCorrectaIndex: dto.respuestaCorrectaIndex,
          seguridad: dto.seguridad,
        },
      });
    } else {
      return this.prisma.pregunta.create({
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
          respuestas: dto.respuestas,
          respuestaCorrectaIndex: dto.respuestaCorrectaIndex,
          seguridad: dto.seguridad,
        },
      });
    }
  }

  public getTemas() {
    return this.prisma.tema.findMany({});
  }

  public async importarExcel(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Asume que los datos están en la primera hoja
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(sheet);

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
          respuestas: respuestasArray,
          respuestaCorrectaIndex: parseInt(entry['Correct answer'], 10) - 1,
          temaId: temaExistente.id,
          dificultad: dificultadEnum,
          relevancia: relevanciaArray,
        },
      });
    }

    return { message: 'Archivo procesado exitosamente' };
  }
}
