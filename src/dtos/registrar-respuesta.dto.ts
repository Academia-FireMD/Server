import { SeguridadAlResponder } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class RegistrarRespuestaDto {
  @IsInt()
  @IsNotEmpty({ message: 'El testId es obligatorio.' })
  testId: number;

  @IsInt()
  @IsNotEmpty({ message: 'El preguntaId es obligatorio.' })
  preguntaId: number;

  @IsInt()
  @IsOptional()
  respuestaDada?: number;

  @IsBoolean()
  @IsOptional()
  omitida?: boolean;

  @IsEnum(SeguridadAlResponder, {
    message: 'El valor de seguridad debe ser válido.',
  })
  @IsOptional() // Si el campo no es obligatorio, se marca como opcional
  seguridad?: SeguridadAlResponder;
}
