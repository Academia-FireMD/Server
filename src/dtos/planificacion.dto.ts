import {
  IsArray,
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AsignarPlanificacionMensualDto {
  @IsInt()
  @Min(1)
  planificacionId: number;

  @IsArray()
  @IsNotEmpty({ each: true })
  alumnosIds: number[];
}

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
  @IsNumber()
  @IsOptional()
  id?: number;

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
  comentariosAlumno?: string;

  @IsBoolean()
  @IsOptional()
  realizado?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  bloqueId?: number; // ID opcional del bloque al que pertenece el sub-bloque
}
export class CreateOrUpdatePlanificacionMensualDto {
  @IsOptional()
  @IsInt({ message: 'El ID debe ser un número entero.' })
  id?: number;

  @IsString()
  @IsNotEmpty({ message: 'El identificador de la planificación es requerido.' })
  identificador: string;

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
  @IsNotEmpty({ message: 'Los sub-bloques son requeridos.' })
  subBloques: CreateSubBloqueDto[]; // Array de sub-bloques en lugar de días

  @IsArray()
  @IsOptional()
  alumnosAsignados?: number[]; // Lista de IDs de alumnos a los que se les asigna la planificación
}
