import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemaDto {
  numero: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @MaxLength(500, {
    message: 'La descripción no puede tener más de 500 caracteres.',
  })
  descripcion?: string;



  @IsOptional()
  @IsInt({ message: 'El ID del módulo debe ser un número entero.' })
  moduloId?: number;
}

export class UpdateTemaDto extends CreateTemaDto {
  @IsOptional()
  @IsInt({ message: 'El ID debe ser un número entero.' })
  id?: number;

  // Todas las propiedades de CreateTemaDto ya están incluidas y son opcionales.
}
