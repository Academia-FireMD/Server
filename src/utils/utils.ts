import { BadRequestException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from 'src/servicios/prisma.service';

export const formatWithLeadingZeros = (num: number, totalLength: number) => {
  return num.toString().padStart(totalLength, '0');
};

export const generarIdentificador = async (
  rol: Rol,
  type: 'FLASHCARD' | 'PREGUNTA',
  temaId: number,
  prisma: PrismaService,
) => {
  const map = {
    ['FLASHCARD']: {
      [Rol.ADMIN]: {
        obtainNextId: async () => {
          const maxId = await prisma.flashcardData.aggregate({
            where: {
              temaId: temaId,
              createdBy: {
                rol: {
                  not: 'ALUMNO',
                },
              },
            },
            _max: {
              id: true,
            },
          });
          return (maxId._max.id || 0) + 1; // Si no hay registros, empieza desde 1
        },
      },
      [Rol.ALUMNO]: {
        obtainNextId: async () => {
          const maxId = await prisma.flashcardData.aggregate({
            where: {
              temaId: temaId,
              createdBy: {
                rol: 'ALUMNO',
              },
            },
            _max: {
              id: true,
            },
          });
          return (maxId._max.id || 0) + 1; // Si no hay registros, empieza desde 1
        },
      },
    },
    ['PREGUNTA']: {
      [Rol.ADMIN]: {
        obtainNextId: async () => {
          const maxId = await prisma.pregunta.aggregate({
            where: {
              temaId: temaId,
              createdBy: {
                rol: {
                  not: 'ALUMNO',
                },
              },
            },
            _max: {
              id: true,
            },
          });
          return (maxId._max.id || 0) + 1; // Si no hay registros, empieza desde 1
        },
      },
      [Rol.ALUMNO]: {
        obtainNextId: async () => {
          const maxId = await prisma.pregunta.aggregate({
            where: {
              temaId: temaId,
              createdBy: {
                rol: 'ALUMNO',
              },
            },
            _max: {
              id: true,
            },
          });
          return (maxId._max.id || 0) + 1; // Si no hay registros, empieza desde 1
        },
      },
    },
  };
  const foundTema = await prisma.tema.findFirst({
    where: {
      id: temaId,
    },
  });
  if (!foundTema) throw new BadRequestException('Tema no existe!');
  const firstChar = type == 'FLASHCARD' ? 'F' : 'T';
  const secondChar = foundTema.categoria.charAt(0);
  const thirdChar = rol == Rol.ALUMNO ? 'A' : '';
  const forthChar = foundTema.numero;
  const code = await map[type][rol].obtainNextId();
  return (
    firstChar +
    secondChar +
    thirdChar +
    forthChar +
    '.' +
    formatWithLeadingZeros(code, 3)
  );
};
