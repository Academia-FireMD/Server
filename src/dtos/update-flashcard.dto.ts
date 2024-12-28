import { Comunidad, Dificultad } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFlashcardDataDto {
  @IsOptional()
  identificador?: string;

  @IsOptional()
  @IsArray({ message: 'Relevancia debe ser un array.' })
  @IsEnum(Comunidad, {
    each: true,
    message:
      'Cada relevancia debe ser un valor válido de la enumeración Comunidad.',
  })
  @ArrayMinSize(1, {
    message: 'Debe haber al menos un elemento en relevancia.',
  })
  relevancia?: Comunidad[];

  @IsOptional()
  @IsEnum(Dificultad, {
    message:
      'La dificultad debe ser un valor válido de la enumeración Dificultad.',
  })
  dificultad?: Dificultad;

  @IsOptional()
  @IsInt({ message: 'El id del tema debe ser un número entero.' })
  temaId?: number;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La descripción no puede estar vacía.' })
  descripcion?: string;

  @IsOptional()
  @IsString({ message: 'La solución debe ser una cadena de texto.' })
  solucion?: string;
}

export class UpdateFlashcardDataDto extends CreateFlashcardDataDto {
  @IsOptional()
  @IsInt({ message: 'El ID debe ser un número entero.' })
  id?: number;
}
