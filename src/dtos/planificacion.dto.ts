import {
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBloqueDto {
  @IsString()
  @IsNotEmpty({ message: 'El identificador del bloque es requerido.' })
  identificador: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @IsNotEmpty({ message: 'Los subbloques son requeridos.' })
  subBloques: CreateSubBloqueDto[];
}

export class UpdateBloqueDto extends CreateBloqueDto {
  @IsOptional()
  @IsInt({ message: 'El ID debe ser un número entero.' })
  id?: number;
}

export class CreateOrUpdatePlantillaSemanalDto {
  @IsOptional()
  @IsInt({ message: 'El ID debe ser un número entero.' })
  id?: number;

  @IsString()
  @IsNotEmpty({ message: 'El identificador de la plantilla es requerido.' })
  identificador: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @IsNotEmpty({ message: 'Los sub-bloques son requeridos.' })
  subBloques: CreateSubBloqueDto[]; // Array de sub-bloques en lugar de días
}

export class CreateSubBloqueDto {
  @IsDate()
  @IsNotEmpty({ message: 'La fecha y hora de inicio son requeridas.' })
  horaInicio: Date;

  @IsNumber()
  @IsNotEmpty({ message: 'La duración es requerida.' })
  duracion: number;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del sub-bloque es requerido.' })
  nombre: string;

  @IsString()
  @IsOptional()
  comentarios?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  bloqueId?: number; // ID opcional del bloque al que pertenece el sub-bloque
}
export class CreatePlanificacionMensualDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la planificación es requerido.' })
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @IsNotEmpty({ message: 'El mes es requerido y debe ser un número entero.' })
  mes: number; // Mes (1-12)

  @IsInt()
  @IsNotEmpty({ message: 'El año es requerido y debe ser un número entero.' })
  ano: number; // Año

  @IsArray()
  @IsNotEmpty({ message: 'Las plantillas son requeridas.' })
  plantillas: number[]; // Lista de IDs de plantillas semanales a usar en la planificación mensual

  @IsArray()
  @IsOptional()
  bloquesAdicionales?: number[]; // Lista de IDs de bloques adicionales a asignar

  @IsArray()
  @IsOptional()
  alumnosAsignados?: number[]; // Lista de IDs de alumnos a los que se les asigna la planificación
}
