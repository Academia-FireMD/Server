import { Dificultad } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FeedbackDto {
  @IsNotEmpty({ message: 'El ID de la pregunta es obligatorio.' })
  preguntaId: number;

  @IsOptional()
  usuarioId: number;

  @IsEnum(Dificultad, { message: 'La dificultad percibida no es válida.' })
  dificultadPercibida: Dificultad;

  @IsString()
  @IsOptional()
  comentario?: string;
}
