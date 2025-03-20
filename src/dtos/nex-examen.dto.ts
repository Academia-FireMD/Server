import { Comunidad, EstadoExamen, Pregunta, TipoAcceso } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class NewExamenDto {
    @IsString()
    @IsNotEmpty()
    titulo: string;

    @IsString()
    @IsOptional()
    descripcion?: string;

    @IsNumber()
    @IsOptional()
    duracion?: number;

    @IsEnum(EstadoExamen)
    @IsOptional()
    estado?: EstadoExamen;

    @IsEnum(TipoAcceso)
    @IsOptional()
    tipoAcceso?: TipoAcceso;

    @IsString()
    @IsOptional()
    codigoAcceso?: string;

    @IsDateString()
    @IsOptional()
    fechaActivacion?: string;

    @IsDateString()
    @IsOptional()
    fechaSolucion?: string;

    @IsArray()
    @IsOptional()
    @IsEnum(Comunidad, { each: true })
    relevancia?: Comunidad[];

    @IsString()
    @IsOptional()
    consideracionesGenerales?: string;

    @IsArray()
    @IsNumber({}, { each: true })
    @IsOptional()
    temas?: number[];

    @IsArray()
    @IsOptional()
    preguntasSeleccionadas?: Pregunta[];
}