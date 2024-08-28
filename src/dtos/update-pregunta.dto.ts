import { Comunidad, Dificultad, SeguridadAlResponder } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePreguntaDto {
  @IsOptional()
  @IsString({ message: 'El identificador debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El identificador no puede estar vacío.' })
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

  @IsOptional()
  @IsArray({ message: 'Respuestas debe ser un array.' })
  @IsString({
    each: true,
    message: 'Cada respuesta debe ser una cadena de texto.',
  })
  @ArrayMinSize(1, {
    message: 'Debe haber al menos un elemento en respuestas.',
  })
  respuestas?: string[];

  @IsDefined({
    message: 'El índice de la respuesta correcta es obligatorio.',
  })
  @IsNotEmpty({
    message: 'El índice de la respuesta correcta no puede estar vacío.',
  })
  @IsInt({
    message: 'El índice de la respuesta correcta debe ser un número entero.',
  })
  respuestaCorrectaIndex?: number;

  @IsOptional()
  @IsEnum(SeguridadAlResponder, {
    message: 'La seguridad debe ser un valor correcto del enum.',
  })
  @IsNotEmpty({ message: 'La seguridad no puede estar vacía.' })
  seguridad?: SeguridadAlResponder;
}

export class UpdatePreguntaDto extends CreatePreguntaDto {
  @IsOptional()
  @IsInt({ message: 'El ID debe ser un número entero.' })
  id?: number;
}
