import { Comunidad } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?_&])[A-Za-z\d@$_!%*?&()]{8,}$/,
    {
      message:
        'La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales',
    },
  )
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  apellidos: string;

  @IsEnum(Comunidad, {
    message: 'La comunidad seleccionada no es válida',
  })
  @IsNotEmpty({ message: 'La comunidad es obligatoria' })
  comunidad: Comunidad;

  @IsOptional()
  @IsInt({ message: 'El ID del tutor debe ser un número entero' })
  tutorId?: number;
}
