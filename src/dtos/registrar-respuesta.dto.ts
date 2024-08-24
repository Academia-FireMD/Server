import { SeguridadAlResponder } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class RegistrarRespuestaDto {
  @IsInt()
  @IsNotEmpty({ message: 'El testId es obligatorio.' })
  testId: number;

  @IsInt()
  @IsNotEmpty({ message: 'El preguntaId es obligatorio.' })
  preguntaId: number;

  @IsInt()
  @Min(0, { message: 'El índice de la respuesta debe ser un número positivo.' })
  @IsNotEmpty({ message: 'El índice de la respuesta es obligatorio.' })
  respuestaDada: number;

  @IsEnum(SeguridadAlResponder, {
    message: 'El valor de seguridad debe ser válido.',
  })
  @IsOptional() // Si el campo no es obligatorio, se marca como opcional
  seguridad?: SeguridadAlResponder;
}
