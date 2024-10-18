import { Comunidad } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&()]{8,}$/,
    {
      message:
        'La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales',
    },
  )
  password: string;

  @IsEnum(Comunidad, {
    message: 'La comunidad seleccionada no es válida',
  })
  @IsNotEmpty({ message: 'La comunidad es obligatoria' })
  comunidad: Comunidad;
}
