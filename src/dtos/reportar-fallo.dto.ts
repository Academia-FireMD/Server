import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReportarFalloDto {
  @IsInt({ message: 'El ID de la pregunta debe ser un número entero' })
  preguntaId: number;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres',
  })
  @MaxLength(500, {
    message: 'La descripción no puede tener más de 500 caracteres',
  })
  descripcion: string;
}

export class ReportarFalloFlashcardDto {
  @IsInt({ message: 'El ID de la flashcard debe ser un número entero' })
  flashcardDataId: number;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres',
  })
  @MaxLength(500, {
    message: 'La descripción no puede tener más de 500 caracteres',
  })
  descripcion: string;
}
