import {
  IsArray,
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

export class CreateSubBloqueDto {
  @IsString()
  @IsNotEmpty({ message: 'La hora de inicio es requerida.' })
  horaInicio: string; // Formato 'HH:mm'

  @IsInt()
  @IsNotEmpty({
    message: 'La duración es requerida y debe ser un número entero.',
  })
  duracion: number; // Duración en minutos

  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  comentarios?: string;

  @IsNumber()
  @IsOptional()
  id?: number;
}

export class CreatePlantillaSemanalDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la plantilla es requerido.' })
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @IsNotEmpty({ message: 'Los días de la semana son requeridos.' })
  dias: CreateDiaSemanaDto[];
}

export class CreateDiaSemanaDto {
  @IsString()
  @IsNotEmpty({ message: 'El día es requerido.' })
  dia: string; // Ej: "Lunes", "Martes"

  @IsArray()
  @IsNotEmpty({ message: 'Los bloques son requeridos.' })
  bloques: number[]; // IDs de los bloques a asignar al día
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
