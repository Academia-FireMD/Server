import { FactorName } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
export class UpdateFactorDto {
  @IsEnum(FactorName, {
    message: 'El nombre del factor es no es tipo FactorName.',
  })
  @IsNotEmpty({ message: 'El nombre del factor es requerido.' })
  name?: FactorName;

  @IsNumber(
    {},
    {
      message: 'El valor debe ser numerico.',
    },
  )
  @IsNotEmpty({ message: 'El valor no puede ser nulo!.' })
  value?: number;
}
