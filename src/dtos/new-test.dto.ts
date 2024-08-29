import { Dificultad } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class NewTestDto {
  @IsBoolean({ message: 'Debes proveer un valor booleano' })
  generarTestDeRepaso: boolean;
  @IsNumber(
    {},
    { message: 'Debes proveer un número de preguntas para iniciar el test' },
  )
  numPreguntas: number;

  @IsEnum(Dificultad, {
    message: 'Debes proveer una dificultad para el test.',
  })
  dificultad: Dificultad;

  @IsArray({ message: 'Temas debe ser un array de números' })
  @IsNumber({}, { each: true, message: 'Cada tema debe ser un número' })
  temas: number[];

  @IsOptional()
  @IsNumber({}, { message: 'La duración debe ser un número' })
  @Min(1, { message: 'La duración debe ser al menos 1 minuto' })
  duracion?: number; // Duración en minutos (opcional)
}
