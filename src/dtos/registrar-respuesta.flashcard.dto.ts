import { EstadoFlashcard } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';

export class RegistrarRespuestaFlashcardDto {
  @IsInt()
  @IsNotEmpty({ message: 'El testId es obligatorio.' })
  testId: number;

  @IsInt()
  @IsNotEmpty({ message: 'El testItemId es obligatorio.' })
  testItemId: number; // Relación con el ítem del test que contiene la flashcard

  @IsInt()
  @IsNotEmpty({ message: 'El flashcardId es obligatorio.' })
  flashcardId: number;

  @IsEnum(EstadoFlashcard, {
    message:
      'El estado de la respuesta debe ser un valor válido (BIEN, MAL, REVISAR).',
  })
  @IsNotEmpty({ message: 'El estado de la respuesta es obligatorio.' })
  estado: EstadoFlashcard; // Estado de la respuesta: BIEN, MAL, REVISAR
}
