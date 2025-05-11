import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateModuloDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @MaxLength(100, {
    message: 'El nombre no puede tener más de 100 caracteres.',
  })
  nombre: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @MaxLength(500, {
    message: 'La descripción no puede tener más de 500 caracteres.',
  })
  descripcion?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo esPublico debe ser un booleano.' })
  esPublico?: boolean;
}

export class UpdateModuloDto extends CreateModuloDto {
  @IsOptional()
  @IsInt({ message: 'El ID debe ser un número entero.' })
  id?: number;

  // Todas las propiedades de CreateTemaDto ya están incluidas y son opcionales.
}
