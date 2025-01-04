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
        obtainCount: () => {
          return prisma.flashcardData.count({
            where: {
              temaId: temaId,
              createdBy: {
                rol: {
                  not: 'ALUMNO',
                },
              },
            },
          });
        },
      },
      [Rol.ALUMNO]: {
        obtainCount: () => {
          return prisma.flashcardData.count({
            where: {
              temaId: temaId,
              createdBy: {
                rol: 'ALUMNO',
              },
            },
          });
        },
      },
    },
    ['PREGUNTA']: {
      [Rol.ADMIN]: {
        obtainCount: () => {
          return prisma.pregunta.count({
            where: {
              temaId: temaId,
              createdBy: {
                rol: {
                  not: 'ALUMNO',
                },
              },
            },
          });
        },
      },
      [Rol.ALUMNO]: {
        obtainCount: () => {
          return prisma.pregunta.count({
            where: {
              temaId: temaId,
              createdBy: {
                rol: 'ALUMNO',
              },
            },
          });
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
  const code = await map[type][rol].obtainCount();
  return (
    firstChar +
    secondChar +
    thirdChar +
    forthChar +
    '.' +
    formatWithLeadingZeros(code, 3)
  );
};
