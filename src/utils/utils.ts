import { BadRequestException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { cloneDeep } from 'lodash';
import { PrismaService } from 'src/servicios/prisma.service';

export const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid', // Asegura que se use esta zona
  hour: '2-digit',
  minute: '2-digit'
});

export const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid', // Asegura que se use esta zona
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});


export const formatWithLeadingZeros = (num: number, totalLength: number) => {
  return num.toString().padStart(totalLength, '0');
};

export const modifyItemId = async (
  type: 'PREGUNTA' | 'FLASHCARD',
  id: string,
  offset: number,
  prisma: any,
  createNewOnNonExistent = false,
): Promise<string> => {
  const prismaType = type == 'FLASHCARD' ? 'flashcardData' : 'pregunta';
  const lastDotIndex = id.lastIndexOf('.');
  if (lastDotIndex === -1) {
    throw new BadRequestException('Formato de ID inválido');
  }

  // Tomamos todo lo anterior como "base" (por ejemplo: "TI10.3")
  const base = id.substring(0, lastDotIndex);

  // Tomamos lo que hay después del último punto como itemNumberStr (por ejemplo: "038")
  const itemNumberStr = id.substring(lastDotIndex + 1);

  // Convertimos a número
  let itemNumber = parseInt(itemNumberStr, 10);
  if (isNaN(itemNumber)) {
    throw new BadRequestException(
      'Formato de ID inválido (no se pudo parsear el número)',
    );
  }

  // Modificar el número de la pregunta o flashcard
  itemNumber += offset;

  // Formatear con ceros a la izquierda
  const newId = `${base}.${itemNumber.toString().padStart(3, '0')}`;
  const currentOne = await prisma[prismaType].findFirst({
    where: { identificador: id },
  });
  // Verificar si el nuevo identificador existe en la BD
  const exists = await prisma[prismaType].findFirst({
    where: { identificador: newId },
  });

  if (!exists) {
    if (createNewOnNonExistent) {
      const cloned = cloneDeep(currentOne);
      cloned.id = undefined;
      cloned.descripcion = '';
      cloned.solucion = '';
      cloned.identificador = newId;
      if (prismaType == 'pregunta') {
        cloned.respuestas = ['', '', '', ''];
        cloned.respuestaCorrectaIndex = 0;
      }
      const res = await prisma[prismaType].create({
        data: cloned,
      });

      return res;
    } else {
      throw new BadRequestException(
        `No hay más ${type.toLowerCase()}s con el identificador ${newId}`,
      );
    }
  }

  return exists;
};

export const generarIdentificador = async (
  rol: Rol,
  type: 'FLASHCARD' | 'PREGUNTA',
  temaId: number,
  prisma: PrismaService,
  esTipoExamen = false,
) => {
  const foundTema = await prisma.tema.findFirst({
    where: {
      id: temaId,
    },
    include: {
      modulo: true,
    },
  });
  if (!foundTema) throw new BadRequestException('Tema no existe!');
  
  const firstChar = type == 'FLASHCARD' ? 'F' : 'T';
  const secondChar = foundTema.modulo.nombre.charAt(0);
  const thirdChar = rol == Rol.ALUMNO ? 'A' : '';
  const forthChar = foundTema.numero;
  const fifthChar = esTipoExamen ? 'E' : '';
  
  // Construir el prefijo del identificador
  const prefix = firstChar + secondChar + thirdChar + forthChar + fifthChar;
  
  // Buscar el máximo número existente con este prefijo
  let maxNumber = 0;
  
  if (type === 'FLASHCARD') {
    const similarFlashcards = await prisma.flashcardData.findMany({
      where: {
        identificador: {
          startsWith: prefix
        },
        temaId: temaId
      },
      orderBy: {
        identificador: 'desc'
      },
      take: 10 // Tomamos varios para asegurarnos de encontrar el máximo
    });
    
    for (const flashcard of similarFlashcards) {
      // Extraer la parte numérica después del último punto
      const parts = flashcard.identificador.split('.');
      const numPart = parts[parts.length - 1];
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  } else { // PREGUNTA
    const similarPreguntas = await prisma.pregunta.findMany({
      where: {
        identificador: {
          startsWith: prefix
        },
        temaId: temaId
      },
      orderBy: {
        identificador: 'desc'
      },
      take: 10 // Tomamos varios para asegurarnos de encontrar el máximo
    });
    
    for (const pregunta of similarPreguntas) {
      // Extraer la parte numérica después del último punto
      const parts = pregunta.identificador.split('.');
      const numPart = parts[parts.length - 1];
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  // Incrementar el número y formatear
  const nextNumber = maxNumber + 1;
  return prefix + '.' + formatWithLeadingZeros(nextNumber, 3);
};
